import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { WatercolorService } from '@/lib/watercolor-service';

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

    // Step 1: Traditional item recognition (existing logic)
    // You could call your existing analyze-item logic here
    // For now, let's create a simple mock recognition result
    const mockRecognition = {
      recognized: true,
      name: 'Preview Item',
      description: 'AI-detected item for preview',
      confidence: 0.85,
      category: 'tools',
    };

    // Step 2: Generate watercolor visualization
    const watercolorService = new WatercolorService();
    const previewId = `preview-${Date.now()}-${userId}`;

    try {
      const result = await watercolorService.renderWatercolor({
        itemId: previewId,
        originalImageBuffer: imageBuffer,
        originalImageName: imageFile.name || 'preview.jpg',
        mimeType,
      });

      console.log('✅ AI visualization preview complete');

      return NextResponse.json({
        // Recognition results
        recognized: mockRecognition.recognized,
        name: mockRecognition.name,
        description: mockRecognition.description,
        confidence: mockRecognition.confidence,
        category: mockRecognition.category,

        // Watercolor visualization data
        originalUrl: result.originalUrl,
        maskUrl: result.maskUrl,
        watercolorUrl: result.watercolorUrl,
        watercolorThumbUrl: result.watercolorThumbUrl,
        segmentationMasks: result.segmentationMasks,
        flags: result.flags,

        // Preview metadata
        previewId,
        isPreview: true,
      });
    } catch (watercolorError) {
      console.error('Watercolor processing failed:', watercolorError);

      // Return recognition results without watercolor data if AI processing fails
      return NextResponse.json({
        recognized: mockRecognition.recognized,
        name: mockRecognition.name,
        description: mockRecognition.description,
        confidence: mockRecognition.confidence,
        category: mockRecognition.category,

        // No watercolor data - frontend will handle gracefully
        error: 'Watercolor processing unavailable',
        isPreview: true,
      });
    }
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
