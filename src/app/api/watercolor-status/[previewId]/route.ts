import { NextRequest, NextResponse } from 'next/server';

import { getWatercolorResult } from '../../../../lib/watercolor-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ previewId: string }> }
) {
  const { previewId } = await params;

  if (!previewId) {
    return NextResponse.json({ error: 'Preview ID required' }, { status: 400 });
  }

  console.log('🔍 Checking watercolor status for:', previewId);
  const result = getWatercolorResult(previewId);
  console.log('📦 Retrieved result:', result ? 'Found!' : 'Not found');

  if (result) {
    console.log('✅ Returning watercolor result:', result);
    return NextResponse.json({
      ready: true,
      ...result,
    });
  }

  console.log('⏳ Still processing...');
  return NextResponse.json({
    ready: false,
    message: 'Watercolor still processing...',
  });
}
