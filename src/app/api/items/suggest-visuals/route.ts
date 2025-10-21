import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { ItemConceptService } from '@/lib/item-concept-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, description, brand, count, discardBatchId } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const safeCount = Math.min(Math.max(parseInt(count ?? 3, 10) || 3, 1), 5);

    const service = new ItemConceptService();

    if (discardBatchId && typeof discardBatchId === 'string') {
      await service.discardBatch(discardBatchId, userId);
    }

    const result = await service.generateConcepts({
      userId,
      name,
      description,
      brand,
      count: safeCount,
    });

    return NextResponse.json({
      batchId: result.batchId,
      options: result.options.map((option) => ({
        conceptId: option.id,
        watercolorUrl: option.watercolorUrl,
        watercolorThumbUrl: option.watercolorThumbUrl,
        sourceType: option.sourceType,
        generatedName: option.generatedName,
        sourceAttribution: option.sourceAttribution ?? null,
      })),
    });
  } catch (error) {
    console.error('Error generating item concepts:', error);
    if (
      error instanceof Error &&
      error.message?.includes(
        'GOOGLE_AI_API_KEY environment variable is required'
      )
    ) {
      return NextResponse.json(
        {
          error: 'Concept generation is not configured',
          details: 'Google AI credentials are required',
        },
        { status: 503 }
      );
    }

    if (
      error instanceof Error &&
      error.message === 'ITEM_CONCEPTS_TABLE_MISSING'
    ) {
      return NextResponse.json(
        {
          error: 'Concept storage unavailable',
          details:
            'Run `npx prisma migrate dev` to create the item_concepts table.',
        },
        { status: 503 }
      );
    }

    if (
      error instanceof Error &&
      error.message?.includes('No matching library photos found')
    ) {
      return NextResponse.json(
        {
          error: 'No visuals found',
          message: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate concepts',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
