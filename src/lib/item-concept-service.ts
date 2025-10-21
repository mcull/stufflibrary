import crypto from 'crypto';

import { GoogleGenAI } from '@google/genai';
import {
  ConceptSourceType,
  ItemConcept,
  ItemConceptStatus,
  Prisma,
} from '@prisma/client';

import { db } from './db';
import { PromptSafetyService } from './prompt-safety-service';
import { WatercolorService } from './watercolor-service';

interface ConceptInput {
  userId: string;
  name: string;
  description?: string | null;
  brand?: string | null;
  count?: number;
}

interface OpenverseImage {
  url: string;
  thumbnail: string;
  title?: string;
  creator?: string;
  license?: string;
  provider?: string;
  attribution?: string;
}

interface ConceptOptionSummary {
  id: string;
  watercolorUrl: string | null;
  watercolorThumbUrl: string | null;
  sourceType: ConceptSourceType;
  generatedName?: string | null;
  sourceAttribution?: Record<string, unknown> | null;
}

const DEFAULT_CONCEPT_COUNT = 3;
const CONCEPT_TTL_MS = 1000 * 60 * 60 * 24 * 2; // 48 hours

function isPrismaMissingTableError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    !!error &&
    'code' in error &&
    (error as { code?: string }).code === 'P2021'
  );
}

export class ItemConceptService {
  private watercolorService?: WatercolorService;
  private genAI?: GoogleGenAI;

  constructor(private prisma = db) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenAI({ apiKey });
    }
  }

  private getWatercolorService(): WatercolorService {
    if (!this.watercolorService) {
      this.watercolorService = new WatercolorService();
    }
    return this.watercolorService;
  }

  async generateConcepts(
    input: ConceptInput
  ): Promise<{ batchId: string; options: ConceptOptionSummary[] }> {
    const count = input.count ?? DEFAULT_CONCEPT_COUNT;

    // Safety check
    const safety = await PromptSafetyService.validatePrompt({
      name: input.name,
      description: input.description ?? null,
      brand: input.brand ?? null,
    });
    if (!safety.allowed) {
      throw new Error(safety.reason || 'Description failed safety checks');
    }

    const batchId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + CONCEPT_TTL_MS);
    const summaries: ConceptOptionSummary[] = [];

    // Step 1: Try to source from Openverse (public domain/licensed)
    try {
      const openverseImages = await this.fetchOpenverseImages(input, count);
      for (const image of openverseImages) {
        if (summaries.length >= count) break;
        const concept = await this.createConceptFromImage({
          batchId,
          expiresAt,
          input,
          sourceType: ConceptSourceType.OPENVERSE,
          image,
        });
        if (concept) {
          summaries.push(concept);
        }
      }
    } catch (error) {
      console.warn(
        'Openverse fetch failed, falling back to generative only:',
        error
      );
    }

    // Step 2: Top up with generative imagery if needed
    while (summaries.length < count) {
      const concept = await this.createConceptFromGeneration({
        batchId,
        expiresAt,
        input,
      });
      if (!concept) {
        break;
      }
      summaries.push(concept);
    }

    if (summaries.length === 0) {
      if (!this.genAI) {
        throw new Error(
          'No matching library photos found. Configure GOOGLE_AI_API_KEY to enable watercolor suggestions.'
        );
      }
      throw new Error('Unable to generate concepts at this time');
    }

    return { batchId, options: summaries };
  }

  async consumeConcept(
    conceptId: string,
    userId: string
  ): Promise<ItemConcept | null> {
    const concept = await this.prisma.itemConcept.findFirst({
      where: {
        id: conceptId,
        ownerId: userId,
        status: ItemConceptStatus.READY,
        expiresAt: { gt: new Date() },
      },
    });

    if (!concept) {
      return null;
    }

    return this.prisma.itemConcept.update({
      where: { id: conceptId },
      data: {
        status: ItemConceptStatus.CONSUMED,
        consumedAt: new Date(),
      },
    });
  }

  async discardBatch(batchId: string, userId: string): Promise<void> {
    await this.prisma.itemConcept.updateMany({
      where: {
        batchId,
        ownerId: userId,
        status: {
          in: [ItemConceptStatus.PENDING, ItemConceptStatus.READY],
        },
      },
      data: {
        status: ItemConceptStatus.DISCARDED,
      },
    });
  }

  private async createConceptFromImage({
    batchId,
    expiresAt,
    input,
    sourceType,
    image,
  }: {
    batchId: string;
    expiresAt: Date;
    input: ConceptInput;
    sourceType: ConceptSourceType;
    image: OpenverseImage;
  }): Promise<ConceptOptionSummary | null> {
    let conceptRecord: ItemConcept | null = null;
    try {
      const response = await fetch(image.url, {
        headers: {
          'User-Agent': 'StuffLibrary/1.0 (concept-generation)',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch source image');
      }
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      conceptRecord = await this.prisma.itemConcept.create({
        data: {
          batchId,
          ownerId: input.userId,
          inputName: input.name,
          inputDescription: input.description ?? null,
          inputBrand: input.brand ?? null,
          generatedName: image.title ?? null,
          sourceType,
          sourceAttribution: image.attribution
            ? ({
                title: image.title,
                creator: image.creator,
                provider: image.provider,
                license: image.license,
                attribution: image.attribution,
                sourceUrl: image.url,
              } as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          status: ItemConceptStatus.PENDING,
          expiresAt,
        },
      });

      const watercolor = await this.getWatercolorService().renderWatercolor({
        itemId: `concept-${conceptRecord.id}`,
        originalImageBuffer: imageBuffer,
        originalImageName: `concept-${conceptRecord.id}.jpg`,
        mimeType: contentType,
      });

      const updated = await this.prisma.itemConcept.update({
        where: { id: conceptRecord.id },
        data: {
          watercolorUrl: watercolor.watercolorUrl,
          watercolorThumbUrl: watercolor.watercolorThumbUrl,
          originalImageUrl: watercolor.originalUrl,
          generatedDetails: image.title
            ? ({ title: image.title } as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          status: ItemConceptStatus.READY,
        },
      });

      return {
        id: updated.id,
        watercolorUrl: updated.watercolorUrl,
        watercolorThumbUrl: updated.watercolorThumbUrl,
        sourceType: updated.sourceType,
        generatedName: updated.generatedName,
        sourceAttribution: updated.sourceAttribution
          ? (updated.sourceAttribution as Record<string, unknown>)
          : null,
      };
    } catch (error) {
      console.error('Failed to create concept from sourced image:', error);
      if (isPrismaMissingTableError(error)) {
        throw new Error('ITEM_CONCEPTS_TABLE_MISSING');
      }
      if (conceptRecord) {
        try {
          await this.prisma.itemConcept.update({
            where: { id: conceptRecord.id },
            data: {
              status: ItemConceptStatus.DISCARDED,
            },
          });
        } catch (updateError) {
          console.error('Failed to mark concept as discarded:', updateError);
        }
      }
      return null;
    }
  }

  private async createConceptFromGeneration({
    batchId,
    expiresAt,
    input,
  }: {
    batchId: string;
    expiresAt: Date;
    input: ConceptInput;
  }): Promise<ConceptOptionSummary | null> {
    if (!this.genAI) {
      console.warn('Generative AI unavailable; skipping concept generation');
      return null;
    }

    const prompt = this.buildGenerativePrompt(input);

    let conceptRecord: ItemConcept | null = null;
    try {
      conceptRecord = await this.prisma.itemConcept.create({
        data: {
          batchId,
          ownerId: input.userId,
          inputName: input.name,
          inputDescription: input.description ?? null,
          inputBrand: input.brand ?? null,
          sourceType: ConceptSourceType.GENERATIVE,
          status: ItemConceptStatus.PENDING,
          expiresAt,
        },
      });

      const response = await this.genAI.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      });

      const imagePart = response.candidates?.[0]?.content?.parts?.find(
        (part) => part.inlineData?.data
      );

      if (!imagePart?.inlineData?.data) {
        throw new Error('No image returned from generative model');
      }

      const buffer = Buffer.from(imagePart.inlineData.data, 'base64');

      const watercolor = await this.getWatercolorService().renderWatercolor({
        itemId: `concept-${conceptRecord.id}`,
        originalImageBuffer: buffer,
        originalImageName: `concept-${conceptRecord.id}.webp`,
        mimeType: imagePart.inlineData.mimeType || 'image/webp',
      });

      const updated = await this.prisma.itemConcept.update({
        where: { id: conceptRecord.id },
        data: {
          watercolorUrl: watercolor.watercolorUrl,
          watercolorThumbUrl: watercolor.watercolorThumbUrl,
          originalImageUrl: watercolor.originalUrl,
          generatedDetails: {
            prompt,
            flags: watercolor.flags,
          } as Prisma.InputJsonValue,
          status: ItemConceptStatus.READY,
        },
      });

      return {
        id: updated.id,
        watercolorUrl: updated.watercolorUrl,
        watercolorThumbUrl: updated.watercolorThumbUrl,
        sourceType: updated.sourceType,
        generatedName: updated.generatedName,
        sourceAttribution: null,
      };
    } catch (error) {
      console.error('Failed to generate concept from prompt:', error);
      if (isPrismaMissingTableError(error)) {
        throw new Error('ITEM_CONCEPTS_TABLE_MISSING');
      }
      if (conceptRecord) {
        try {
          await this.prisma.itemConcept.update({
            where: { id: conceptRecord.id },
            data: {
              status: ItemConceptStatus.DISCARDED,
            },
          });
        } catch (updateError) {
          console.error('Failed to mark concept as discarded:', updateError);
        }
      }
      return null;
    }
  }

  private buildGenerativePrompt(input: ConceptInput): string {
    const parts = [
      'Create a single product watercolor illustration with the signature StuffLibrary style.',
      'Style: warm cream background (#F9F5EB), subtle ink outlines, soft watercolor washes, no text anywhere.',
      'Composition: center the item with generous margin, no shadows on the ground, no background clutter.',
    ];

    if (input.brand) {
      parts.push(`Brand context: ${input.brand}.`);
    }

    parts.push(`Item description: ${input.name}.`);

    if (input.description) {
      parts.push(`Additional details: ${input.description}.`);
    }

    parts.push(
      'Constraints: absolutely no people, faces, hands, body parts, weapons, or unsafe objects. Maintain realistic proportions.'
    );

    return parts.join('\n');
  }

  private async fetchOpenverseImages(
    input: ConceptInput,
    limit: number
  ): Promise<OpenverseImage[]> {
    if (limit <= 0) {
      return [];
    }

    const terms = [input.brand ?? '', input.name, input.description ?? '']
      .filter(Boolean)
      .join(' ')
      .trim();

    if (!terms) {
      return [];
    }

    const params = new URLSearchParams({
      q: terms,
      license_type: 'commercial',
      content_filter: 'high',
      page_size: limit.toString(),
    });
    params.set(
      'fields',
      [
        'url',
        'thumbnail',
        'title',
        'creator',
        'license',
        'provider',
        'attribution',
      ].join(',')
    );
    params.set('aspect_ratio', 'square');

    const url = `https://api.openverse.engineering/v1/images/?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'StuffLibrary/1.0 (+https://stufflibrary.com)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Openverse API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data?.results || !Array.isArray(data.results)) {
      return [];
    }

    type OpenverseApiResult = {
      url?: string;
      thumbnail?: string;
      title?: string;
      creator?: string;
      license?: string;
      provider?: string;
      attribution?: string;
    };

    return (data.results as OpenverseApiResult[])
      .map((result) => {
        if (!result?.url) {
          return null;
        }
        return {
          url: result.url as string,
          thumbnail: (result.thumbnail ?? result.url) as string,
          title: result.title as string | undefined,
          creator: result.creator as string | undefined,
          license: result.license as string | undefined,
          provider: result.provider as string | undefined,
          attribution: result.attribution as string | undefined,
        };
      })
      .filter(Boolean)
      .slice(0, limit) as OpenverseImage[];
  }
}
