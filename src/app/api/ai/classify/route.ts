import { NextRequest, NextResponse } from 'next/server';

import { AIService } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, identifier } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image URL provided' },
        { status: 400 }
      );
    }

    // Get client IP for rate limiting if no identifier provided
    const clientIdentifier =
      identifier ||
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'anonymous';

    const result = await AIService.classifyPhoto(imageUrl, {
      identifier: clientIdentifier,
      maxTokens: 100,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.includes('Rate limit') ? 429 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      object: result.object,
      description: result.description,
      condition: result.condition,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('AI classify error:', error);
    return NextResponse.json(
      {
        error: 'Classification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get rate limit status
    const { searchParams } = new URL(request.url);
    const identifier =
      searchParams.get('identifier') ||
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'anonymous';

    const rateLimitStatus = AIService.getRateLimitStatus(identifier);

    return NextResponse.json({
      rateLimit: {
        remaining: rateLimitStatus.remaining,
        resetTime: rateLimitStatus.resetTime,
        resetInSeconds: Math.max(
          0,
          Math.ceil((rateLimitStatus.resetTime - Date.now()) / 1000)
        ),
      },
    });
  } catch (error) {
    console.error('AI rate limit check error:', error);
    return NextResponse.json(
      {
        error: 'Rate limit check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
