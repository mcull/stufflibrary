import crypto from 'crypto';

import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';

// no direct blob import; use StorageService
import { StorageService } from './storage';

interface WatercolorRenderOptions {
  itemId: string;
  originalImageBuffer: Buffer;
  originalImageName: string;
  mimeType: string;
}

interface SegmentationMask {
  label: string;
  box_2d: [number, number, number, number]; // [y0, x0, y1, x1] normalized 0-1000
  mask: string; // base64 encoded PNG
  confidence: number;
}

interface WatercolorResult {
  originalUrl: string;
  watercolorUrl: string;
  watercolorThumbUrl: string;
  maskUrl?: string | undefined; // New: URL to the segmentation mask overlay
  iconUrl?: string | undefined;
  styleVersion: string;
  aiModel: string;
  synthIdWatermark: boolean;
  flags: string[];
  idempotencyKey: string;
  segmentationMasks?: SegmentationMask[] | undefined; // New: detected objects and masks
}

export class WatercolorService {
  private genAI: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  private generateIdempotencyKey(
    itemId: string,
    imageBuffer: Buffer,
    styleVersion: string
  ): string {
    const hash = crypto.createHash('sha256');
    hash.update(itemId);
    hash.update(imageBuffer);
    hash.update(styleVersion);
    return hash.digest('hex');
  }

  private async uploadToStorage(
    buffer: Buffer,
    path: string,
    contentType: string
  ): Promise<string> {
    const { url } = await StorageService.uploadFile(path, buffer, {
      contentType,
      retries: 3,
      retryDelayMs: 250,
      addRandomSuffix: false, // explicit pathing for deterministic URLs
    });
    return url;
  }

  private async detectAndSegmentObjects(
    imageBuffer: Buffer,
    _mimeType: string
  ): Promise<SegmentationMask[]> {
    // Resize image to 1024x1024 for optimal object detection
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(1024, 1024, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    const prompt = [
      {
        text: `Give the segmentation masks for all prominent items in this image that would be relevant for a tool-sharing community library.

Focus on detecting: tools, equipment, household items, books, electronics, sports gear, kitchen items, outdoor gear, and similar shareable objects.

Output a JSON list of segmentation masks where each entry contains:
- "box_2d": 2D bounding box as [y0, x0, y1, x1] normalized to 0-1000
- "mask": segmentation mask as base64 PNG
- "label": descriptive text label for the object
- "confidence": confidence score 0-1

Use descriptive, specific labels that would help someone identify the item for borrowing.`,
      },
      {
        inlineData: {
          data: resizedImageBuffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      },
    ];

    try {
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingBudget: 0, // Disable thinking for better object detection
          },
        },
      });

      const responseText =
        response.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

      // Parse JSON response, handling potential markdown fencing
      let jsonText = responseText;
      if (responseText) {
        const lines = responseText.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i]?.trim() === '```json') {
            jsonText = lines.slice(i + 1).join('\n');
            const endIndex = jsonText.indexOf('```');
            if (endIndex !== -1) {
              jsonText = jsonText.substring(0, endIndex);
            }
            break;
          }
        }
      }

      console.log(
        '🔍 Raw AI response:',
        responseText.substring(0, 200) + '...'
      );
      console.log(
        '🔍 Extracted JSON text:',
        jsonText.substring(0, 200) + '...'
      );

      let masks: SegmentationMask[] = [];
      try {
        masks = JSON.parse(jsonText);
        console.log(
          `🎯 Detected ${masks.length} objects:`,
          masks.map((m) => m.label)
        );
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        console.error('Failed to parse JSON text:', jsonText.substring(0, 500));
        // Try to extract valid JSON from the response if it's malformed
        const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            masks = JSON.parse(jsonMatch[0]);
            console.log(
              '✅ Recovered from malformed JSON, detected objects:',
              masks.length
            );
          } catch (recoveryError) {
            console.error('JSON recovery also failed:', recoveryError);
            masks = []; // Fall back to empty array
          }
        }
      }

      return masks;
    } catch (error) {
      console.error('Error in object detection/segmentation:', error);
      return []; // Return empty array if detection fails
    }
  }

  private async generateMaskOverlay(
    originalImageBuffer: Buffer,
    masks: SegmentationMask[]
  ): Promise<Buffer> {
    // Get original image dimensions
    const { width, height } = await sharp(originalImageBuffer).metadata();
    if (!width || !height) {
      throw new Error('Could not determine image dimensions');
    }

    // Create base overlay
    let overlay = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    });

    // Process each mask and composite them
    for (const maskData of masks) {
      try {
        // Convert normalized coordinates to absolute pixels
        const y0 = Math.floor((maskData.box_2d[0] / 1000) * height);
        const x0 = Math.floor((maskData.box_2d[1] / 1000) * width);
        const y1 = Math.ceil((maskData.box_2d[2] / 1000) * height);
        const x1 = Math.ceil((maskData.box_2d[3] / 1000) * width);

        // Skip invalid bounding boxes
        if (y0 >= y1 || x0 >= x1) continue;

        // Decode base64 mask
        let maskBase64 = maskData.mask;
        if (maskBase64.startsWith('data:image/png;base64,')) {
          maskBase64 = maskBase64.substring('data:image/png;base64,'.length);
        }

        const maskBuffer = Buffer.from(maskBase64, 'base64');

        // Try to resize mask to match bounding box dimensions, with fallback
        let _resizedMask;
        try {
          _resizedMask = await sharp(maskBuffer)
            .resize(x1 - x0, y1 - y0, { fit: 'fill' })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        } catch (maskError) {
          console.warn(
            `⚠️ Corrupted mask from AI for ${maskData.label}, using bounding box fallback:`,
            maskError
          );
          // Skip detailed mask processing and just use bounding box highlight
          _resizedMask = null;
        }

        // Create a highlight overlay for this mask region
        const highlightColor = { r: 255, g: 255, b: 255, alpha: 0.7 }; // Semi-transparent white

        // For now, create a simple bounding box overlay
        // In production, we'd composite the actual mask pixel by pixel
        const boxOverlay = await sharp({
          create: {
            width: x1 - x0,
            height: y1 - y0,
            channels: 4,
            background: highlightColor,
          },
        })
          .png()
          .toBuffer();

        // Composite this mask onto the main overlay
        overlay = overlay.composite([
          {
            input: boxOverlay,
            left: x0,
            top: y0,
            blend: 'over',
          },
        ]);

        console.log(
          `📍 Added overlay for ${maskData.label} at (${x0},${y0}) to (${x1},${y1})`
        );
      } catch (error) {
        console.error(`Error processing mask for ${maskData.label}:`, error);
        continue;
      }
    }

    return overlay.png().toBuffer();
  }

  private async detectPersonsInImage(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<boolean> {
    const prompt = [
      {
        text: `Analyze this image and determine if it contains any people, faces, or human figures.
    
    Return only "true" if people/faces are detected, "false" if not.
    This is for content safety - we need to flag images that contain people.`,
      },
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType,
        },
      },
    ];

    try {
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt,
      });

      const text =
        response.candidates?.[0]?.content?.parts?.[0]?.text
          ?.toLowerCase()
          .trim() || '';
      return text.includes('true');
    } catch (error) {
      console.error('Error detecting persons:', error);
      // Conservative approach: assume people are present if detection fails
      return true;
    }
  }

  private async generateWatercolor(
    imageBuffer: Buffer,
    _mimeType: string,
    hasPersons: boolean = false
  ): Promise<Buffer> {
    const startTime = Date.now();
    console.log('🎨 Starting watercolor generation...');

    // Resize image to 768x768 for cost optimization (single tile)
    const resizeStart = Date.now();
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(768, 768, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();
    const resizeTime = Date.now() - resizeStart;
    console.log(`📐 Image resize completed in ${resizeTime}ms`);

    const deIdentificationText = hasPersons
      ? '\n    CRITICAL: People are present in this image. You MUST completely remove all people, faces, hands, body parts, and any reflections or silhouettes of people. Focus solely on the shareable item and render it as if no people were ever in the photo.'
      : '';

    const prompt = [
      {
        text: `You are a production image editor for StuffLibrary, a community tool-sharing app. 
    Convert this item photo into a consistent watercolor illustration with an "analog librarian" feel.${deIdentificationText}

    Task: Transform the attached photo into a uniform watercolor illustration of the foreground item only.
    Style: subtle ink linework and soft watercolor washes; paper color #F9F5EB (warm cream); slightly desaturated palette; no drop shadows; no background clutter; no visible people.
    Composition: center the object on canvas with ~10% margin; maintain real-world orientation and proportions.
    Constraints: remove any text labels, faces, reflections of people, or household backgrounds. Keep proportions faithful, no cartoonification.
    
    CRITICAL: Do not add any text, numbers, codes, labels, or written characters to the image. The watercolor should contain only the visual illustration of the item with NO TEXT ANYWHERE.
    
    Return a clean watercolor illustration ready for a community sharing platform.`,
      },
      {
        inlineData: {
          data: resizedImageBuffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      },
    ];

    try {
      const apiStart = Date.now();
      console.log('🌐 Sending watercolor request to Gemini API...');

      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: prompt,
      });

      const apiTime = Date.now() - apiStart;
      console.log(`🌐 Gemini API responded in ${apiTime}ms`);

      // Extract image data from response
      const extractStart = Date.now();
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          const imageData = part.inlineData.data;
          const buffer = Buffer.from(imageData, 'base64');
          const extractTime = Date.now() - extractStart;
          const totalTime = Date.now() - startTime;
          console.log(`📦 Image data extracted in ${extractTime}ms`);
          console.log(
            `🎨 Total watercolor generation: ${totalTime}ms (resize: ${resizeTime}ms, API: ${apiTime}ms, extract: ${extractTime}ms)`
          );
          return buffer;
        }
      }

      throw new Error('No image data found in response');
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(
        `❌ Watercolor generation failed after ${totalTime}ms:`,
        error
      );
      throw new Error('Failed to generate watercolor illustration');
    }
  }

  private async generateIcon(
    imageBuffer: Buffer,
    mimeType: string,
    category: string
  ): Promise<Buffer> {
    // Resize to small size for cost optimization
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(384, 384, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    const prompt = [
      {
        text: `Create a 2-color, flat icon representing the item's category (${category}) based on this image.
    
    Style: simplified silhouette/line in Ink Blue #1E3A5F on transparent background; no gradients; no text; no drop shadow.
    Canvas: 256×256 with 12–16% padding; keep the silhouette legible at 24×24.
    Output: PNG with transparency; clean vector-like appearance.`,
      },
      {
        inlineData: {
          data: resizedImageBuffer.toString('base64'),
          mimeType: 'image/jpeg',
        },
      },
    ];

    try {
      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: prompt,
      });

      // Extract image data from response
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          const imageData = part.inlineData.data;
          return Buffer.from(imageData, 'base64');
        }
      }

      // Fallback: create a simple colored square as placeholder
      console.log('No icon image generated, using placeholder');
      const placeholderIcon = await sharp({
        create: {
          width: 256,
          height: 256,
          channels: 4,
          background: { r: 30, g: 58, b: 95, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      return placeholderIcon;
    } catch (error) {
      console.error('Error generating icon:', error);
      throw new Error('Failed to generate category icon');
    }
  }

  private async processImages(
    watercolorBuffer: Buffer,
    iconBuffer?: Buffer
  ): Promise<{
    heroBuffer: Buffer;
    thumbBuffer: Buffer;
    processedIconBuffer?: Buffer | undefined;
  }> {
    // Create hero image (1200x900, 4:3 aspect ratio)
    const heroBuffer = await sharp(watercolorBuffer)
      .resize(1200, 900, {
        fit: 'cover',
        position: 'center',
        background: { r: 249, g: 245, b: 235 }, // #F9F5EB
      })
      .webp({ quality: 80 })
      .toBuffer();

    // Create square thumbnail (600x600)
    const thumbBuffer = await sharp(watercolorBuffer)
      .resize(600, 600, {
        fit: 'cover',
        position: 'center',
        background: { r: 249, g: 245, b: 235 }, // #F9F5EB
      })
      .webp({ quality: 80 })
      .toBuffer();

    let processedIconBuffer: Buffer | undefined;
    if (iconBuffer) {
      // Ensure icon is 256x256 PNG with transparency
      processedIconBuffer = await sharp(iconBuffer)
        .resize(256, 256, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
    }

    return {
      heroBuffer,
      thumbBuffer,
      processedIconBuffer,
    };
  }

  async renderWatercolor(
    options: WatercolorRenderOptions
  ): Promise<WatercolorResult> {
    const { itemId, originalImageBuffer, originalImageName, mimeType } =
      options;
    const styleVersion = 'wc_v1';
    const aiModel = 'gemini-2.5-flash-image-preview';

    // Generate idempotency key
    const idempotencyKey = this.generateIdempotencyKey(
      itemId,
      originalImageBuffer,
      styleVersion
    );

    const flags: string[] = [];

    try {
      // Step 1: Skip object detection for now (too slow for 5s target)
      console.log('⏩ Skipping object detection for fast processing...');
      const segmentationMasks: SegmentationMask[] = [];

      // Step 2: Generate mask overlay
      let maskUrl: string | undefined;
      if (segmentationMasks.length > 0) {
        console.log('🎨 Generating mask overlay...');
        const maskOverlayBuffer = await this.generateMaskOverlay(
          originalImageBuffer,
          segmentationMasks
        );

        const maskPath = `items/${itemId}/masks/${styleVersion}/detection_overlay.png`;
        maskUrl = await this.uploadToStorage(
          maskOverlayBuffer,
          maskPath,
          'image/png'
        );
        console.log('✅ Mask overlay saved:', maskUrl);
      }

      // Step 3: Safety check - detect people in image
      const hasPersons = await this.detectPersonsInImage(
        originalImageBuffer,
        mimeType
      );
      if (hasPersons) {
        flags.push('person_detected');
        console.log(
          'Person detected in image, will be de-identified in watercolor processing'
        );
      }

      // Step 4: Upload original image
      const originalPath = `items/${itemId}/original/${crypto.randomUUID()}.${originalImageName.split('.').pop()}`;
      const originalUrl = await this.uploadToStorage(
        originalImageBuffer,
        originalPath,
        mimeType
      );

      let watercolorUrl: string;
      let watercolorThumbUrl: string;
      let iconUrl: string | undefined;

      // Always generate watercolor, with enhanced de-identification if people detected
      {
        // Step 3: Generate watercolor illustration
        const watercolorStart = Date.now();
        console.log('🎨 Starting watercolor illustration generation...');
        const watercolorBuffer = await this.generateWatercolor(
          originalImageBuffer,
          mimeType,
          hasPersons
        );
        const watercolorTime = Date.now() - watercolorStart;
        console.log(
          `✅ Watercolor generation completed in ${watercolorTime}ms`
        );

        // Step 4: Process image to 600x600 square only
        const processStart = Date.now();
        console.log('🔧 Processing watercolor to 600x600 square...');
        const squareBuffer = await sharp(watercolorBuffer)
          .resize(600, 600, {
            fit: 'cover',
            position: 'center',
            background: { r: 249, g: 245, b: 235 }, // #F9F5EB cream background
          })
          .webp({ quality: 85 })
          .toBuffer();
        const processTime = Date.now() - processStart;
        console.log(`🔧 Square processing completed in ${processTime}ms`);

        // Step 5: Upload square image only
        const uploadStart = Date.now();
        console.log('☁️ Uploading watercolor square to storage...');
        const squarePath = `items/${itemId}/renders/${styleVersion}/square_600x600.webp`;

        watercolorUrl = await this.uploadToStorage(
          squareBuffer,
          squarePath,
          'image/webp'
        );
        // Use same URL for both since we only have one size now
        watercolorThumbUrl = watercolorUrl;
        const uploadTime = Date.now() - uploadStart;
        console.log(`☁️ Square upload completed in ${uploadTime}ms`);

        // Step 6: Generate category icon (optional for now)
        // TODO: Determine category from item metadata
        // const iconBuffer = await this.generateIcon(watercolorBuffer, mimeType, 'tools');
        // const { processedIconBuffer } = await this.processImages(watercolorBuffer, iconBuffer);
        // if (processedIconBuffer) {
        //   const iconPath = `types/unknown/icons/v1/icon_256.png`;
        //   iconUrl = await this.uploadToStorage(processedIconBuffer, iconPath, 'image/png');
        // }
      }

      return {
        originalUrl,
        watercolorUrl,
        watercolorThumbUrl,
        maskUrl,
        iconUrl,
        styleVersion,
        aiModel,
        synthIdWatermark: false, // TODO: Detect SynthID watermarks
        flags,
        idempotencyKey,
        segmentationMasks,
      };
    } catch (error) {
      console.error('Error in watercolor rendering pipeline:', error);
      throw new Error(
        `Watercolor rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
