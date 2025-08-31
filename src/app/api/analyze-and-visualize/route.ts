import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { WatercolorService } from '@/lib/watercolor-service';
import { storeWatercolorResult } from '@/lib/watercolor-storage';

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

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert file to buffer
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const mimeType = imageFile.type || 'image/jpeg';

    console.log('🔍 Starting AI analysis and visualization preview...');

    // Step 1: Traditional item recognition (use existing analyze-item logic)
    console.log('🔍 Starting traditional item recognition...');

    const recognitionFormData = new FormData();
    recognitionFormData.append(
      'image',
      new Blob([imageBuffer], { type: mimeType }),
      'capture.jpg'
    );

    let recognitionResult = {
      recognized: false,
      name: 'Unknown Item',
      description: 'Could not identify item',
      confidence: 0,
      category: 'other',
    };

    try {
      // Call the existing analyze-item endpoint internally
      const analyzeRequest = new NextRequest(
        'http://localhost/api/analyze-item',
        {
          method: 'POST',
          body: recognitionFormData,
        }
      );

      const { POST: analyzePost } = await import('../analyze-item/route');
      const analyzeResponse = await analyzePost(analyzeRequest);

      if (analyzeResponse.ok) {
        const analyzeData = await analyzeResponse.json();
        if (analyzeData.recognized) {
          recognitionResult = {
            recognized: analyzeData.recognized,
            name: analyzeData.name,
            description: analyzeData.description || 'AI-detected item',
            confidence: analyzeData.confidence || 0.85,
            category: analyzeData.category || 'other',
          };
        }
      }
    } catch (error) {
      console.warn('Traditional recognition failed, using fallback:', error);
    }

    console.log('✅ Recognition result:', recognitionResult);

    // Return fast recognition results immediately
    const previewId = `preview-${Date.now()}-${userId}`;

    console.log('⚡ Returning fast recognition response...');

    // Start watercolor processing in background (don't await it)
    const watercolorService = new WatercolorService();
    watercolorService
      .renderWatercolor({
        itemId: previewId,
        originalImageBuffer: imageBuffer,
        originalImageName: imageFile.name || 'preview.jpg',
        mimeType,
      })
      .then((result) => {
        console.log(
          '✅ Background watercolor processing complete for',
          previewId
        );

        // Store result for polling endpoint
        const watercolorData = {
          originalUrl: result.originalUrl,
          maskUrl: result.maskUrl,
          watercolorUrl: result.watercolorUrl,
          watercolorThumbUrl: result.watercolorThumbUrl,
          segmentationMasks: result.segmentationMasks,
          flags: result.flags,
        };
        console.log(
          '💾 Storing watercolor result for polling:',
          previewId,
          watercolorData
        );
        storeWatercolorResult(previewId, watercolorData);
      })
      .catch((error) => {
        console.error('❌ Background watercolor processing failed:', error);

        // Store error result
        storeWatercolorResult(previewId, {
          error: 'Watercolor processing failed',
          details: error.message,
        });
      });

    return NextResponse.json({
      // Recognition results (immediate)
      recognized: recognitionResult.recognized,
      name: recognitionResult.name,
      description: recognitionResult.description,
      confidence: recognitionResult.confidence,
      category: recognitionResult.category,

      // Preview metadata
      previewId,
      isPreview: true,

      // Status flags
      watercolorProcessing: true, // Indicates watercolor is being generated in background
    });
  } catch (error) {
    console.error('❌ Error in AI analysis and visualization:', error);

    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
