import crypto from 'crypto';

import { GoogleGenerativeAI } from '@google/generative-ai';
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
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
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

  private async detectPersonsInImage(imageBuffer: Buffer): Promise<boolean> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
    Analyze this image and determine if it contains any people, faces, or human figures.
    
    Return only "true" if people/faces are detected, "false" if not.
    This is for content safety - we need to flag images that contain people.
    `;

    try {
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: 'image/jpeg',
          },
        },
      ]);

      const response = await result.response;
      const text = response.text().toLowerCase().trim();
      return text.includes('true');
    } catch (error) {
      console.error('Error detecting persons:', error);
      // Conservative approach: assume people are present if detection fails
      return true;
    }
  }

  private async generateWatercolor(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<Buffer> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        maxOutputTokens: 1024,
      },
    });

    const systemMessage = `
    You are a production image editor for StuffLibrary, a community tool-sharing app. 
    Convert item photos into consistent watercolor illustrations with an "analog librarian" feel. 
    Isolate the object, remove messy backgrounds, and render on warm cream paper. 
    Keep proportions faithful, no cartoonification. Avoid text overlays and branding.
    `;

    const userPrompt = `
    Input: [attached item photo]
    Task: Produce a uniform watercolor illustration of the foreground item only.
    Style: subtle ink linework and soft watercolor washes; paper color #F9F5EB; slightly desaturated palette; no drop shadows; no background clutter; no visible people.
    Composition: center the object on canvas with ~10% margin; maintain real-world orientation.
    Output: 1200×900 (4:3) clean edges.
    Constraints: remove any text labels, faces, reflections of people, or household backgrounds.
    Return: the watercolor image with maintained SynthID/visible AI marks.
    `;

    try {
      const result = await model.generateContent([
        systemMessage + '\n\n' + userPrompt,
        {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: mimeType,
          },
        },
      ]);

      const response = await result.response;

      // Note: This is a placeholder for the actual image generation
      // The Gemini Image API would return binary image data
      // For now, we'll use the original image as a fallback
      console.log('Watercolor generation result:', response);

      // TODO: Extract the generated image buffer from the response
      // This depends on the exact API response format from Gemini 2.5 Flash Image

      return imageBuffer; // Temporary fallback
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
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: {
        temperature: 0.2,
        topP: 0.6,
        maxOutputTokens: 512,
      },
    });

    const userPrompt = `
    Input: [watercolor result or original photo]
    Task: Create a 2-color, flat icon representing the item's category (${category}).
    Style: simplified silhouette/line in Ink Blue #1E3A5F on transparent background; no gradients; no text; no drop shadow.
    Canvas: 256×256 with 12–16% padding; keep the silhouette legible at 24×24.
    Output: PNG with transparency; clean vector-like appearance.
    `;

    try {
      const result = await model.generateContent([
        userPrompt,
        {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: mimeType,
          },
        },
      ]);

      const response = await result.response;

      // Note: This is a placeholder for the actual icon generation
      // The Gemini Image API would return binary image data
      console.log('Icon generation result:', response);

      // TODO: Extract the generated image buffer from the response
      // For now, create a simple colored square as a placeholder
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
    const aiModel = 'gemini-2.5-flash-image';

    // Generate idempotency key
    const idempotencyKey = this.generateIdempotencyKey(
      itemId,
      originalImageBuffer,
      styleVersion
    );

    const flags: string[] = [];

    try {
      // Step 1: Safety check - detect people in image
      const hasPersons = await this.detectPersonsInImage(originalImageBuffer);
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
