import crypto from 'crypto';

import { GoogleGenAI } from '@google/genai';
import { put } from '@vercel/blob';
import sharp from 'sharp';

interface WatercolorRenderOptions {
  itemId: string;
  originalImageBuffer: Buffer;
  originalImageName: string;
  mimeType: string;
}

interface WatercolorResult {
  originalUrl: string;
  watercolorUrl: string;
  watercolorThumbUrl: string;
  iconUrl?: string | undefined;
  styleVersion: string;
  aiModel: string;
  synthIdWatermark: boolean;
  flags: string[];
  idempotencyKey: string;
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
    const blob = await put(path, buffer, {
      access: 'public',
      contentType,
    });
    return blob.url;
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
    _mimeType: string
  ): Promise<Buffer> {
    // Resize image to 768x768 for cost optimization (single tile)
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(768, 768, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    const prompt = [
      {
        text: `You are a production image editor for StuffLibrary, a community tool-sharing app. 
    Convert this item photo into a consistent watercolor illustration with an "analog librarian" feel.

    Task: Transform the attached photo into a uniform watercolor illustration of the foreground item only.
    Style: subtle ink linework and soft watercolor washes; paper color #F9F5EB (warm cream); slightly desaturated palette; no drop shadows; no background clutter; no visible people.
    Composition: center the object on canvas with ~10% margin; maintain real-world orientation and proportions.
    Constraints: remove any text labels, faces, reflections of people, or household backgrounds. Keep proportions faithful, no cartoonification.
    
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

      throw new Error('No image data found in response');
    } catch (error) {
      console.error('Error generating watercolor:', error);
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
      // Step 1: Safety check - detect people in image
      const hasPersons = await this.detectPersonsInImage(
        originalImageBuffer,
        mimeType
      );
      if (hasPersons) {
        flags.push('person_detected');
        console.log(
          'Person detected in image, watercolor generation may be skipped'
        );
      }

      // Step 2: Upload original image
      const originalPath = `items/${itemId}/original/${crypto.randomUUID()}.${originalImageName.split('.').pop()}`;
      const originalUrl = await this.uploadToStorage(
        originalImageBuffer,
        originalPath,
        mimeType
      );

      let watercolorUrl: string;
      let watercolorThumbUrl: string;
      let iconUrl: string | undefined;

      if (hasPersons) {
        // Skip watercolor generation for images with people
        // Use processed original images instead
        const { heroBuffer, thumbBuffer } =
          await this.processImages(originalImageBuffer);

        const heroPath = `items/${itemId}/renders/${styleVersion}/hero_1200x900.webp`;
        const thumbPath = `items/${itemId}/renders/${styleVersion}/thumb_600x600.webp`;

        watercolorUrl = await this.uploadToStorage(
          heroBuffer,
          heroPath,
          'image/webp'
        );
        watercolorThumbUrl = await this.uploadToStorage(
          thumbBuffer,
          thumbPath,
          'image/webp'
        );
      } else {
        // Step 3: Generate watercolor illustration
        const watercolorBuffer = await this.generateWatercolor(
          originalImageBuffer,
          mimeType
        );

        // Step 4: Process images (resize, format conversion)
        const { heroBuffer, thumbBuffer } =
          await this.processImages(watercolorBuffer);

        // Step 5: Upload processed images
        const heroPath = `items/${itemId}/renders/${styleVersion}/hero_1200x900.webp`;
        const thumbPath = `items/${itemId}/renders/${styleVersion}/thumb_600x600.webp`;

        watercolorUrl = await this.uploadToStorage(
          heroBuffer,
          heroPath,
          'image/webp'
        );
        watercolorThumbUrl = await this.uploadToStorage(
          thumbBuffer,
          thumbPath,
          'image/webp'
        );

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
        iconUrl,
        styleVersion,
        aiModel,
        synthIdWatermark: false, // TODO: Detect SynthID watermarks
        flags,
        idempotencyKey,
      };
    } catch (error) {
      console.error('Error in watercolor rendering pipeline:', error);
      throw new Error(
        `Watercolor rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
