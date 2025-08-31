'use client';

import { Box, Typography, CircularProgress } from '@mui/material';
import { useEffect, useState, useRef } from 'react';

interface AIVisualizationAnimationProps {
  originalImageUrl: string;
  maskUrl?: string | undefined;
  watercolorUrl?: string | undefined;
  onAnimationComplete?: () => void;
}

export function AIVisualizationAnimation({
  originalImageUrl,
  maskUrl,
  watercolorUrl,
  onAnimationComplete,
}: AIVisualizationAnimationProps) {
  const [phase, setPhase] = useState<
    'loading' | 'mask' | 'watercolor' | 'complete'
  >('loading');
  const [maskOpacity, setMaskOpacity] = useState(0);
  const [originalOpacity, setOriginalOpacity] = useState(1);
  const [watercolorOpacity, setWatercolorOpacity] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!maskUrl || !watercolorUrl) return;

    const sequence = async () => {
      // Phase 1: Show mask overlay fading in (1 second)
      setTimeout(() => {
        setPhase('mask');
        setMaskOpacity(1);
      }, 500);

      // Phase 2: Cross-fade from original to watercolor (1.5 seconds)
      setTimeout(() => {
        setPhase('watercolor');
        setOriginalOpacity(0);
        setWatercolorOpacity(1);
        setMaskOpacity(0);
      }, 2000);

      // Phase 3: Complete
      setTimeout(() => {
        setPhase('complete');
        onAnimationComplete?.();
      }, 3500);
    };

    sequence();
  }, [maskUrl, watercolorUrl, onAnimationComplete]);

  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      {phase === 'loading' && (
        <>
          <CircularProgress size={64} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Analyzing item...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AI is detecting objects in your image
          </Typography>
        </>
      )}

      {(phase === 'mask' || phase === 'watercolor' || phase === 'complete') && (
        <Box sx={{ position: 'relative', maxWidth: 400, mx: 'auto', mb: 2 }}>
          <Box
            ref={containerRef}
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: 3,
            }}
          >
            {/* Original Image Layer */}
            <img
              src={originalImageUrl}
              alt="Original item"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: originalOpacity,
                transition: 'opacity 1.5s ease-in-out',
              }}
            />

            {/* Watercolor Layer */}
            {watercolorUrl && (
              <img
                src={watercolorUrl}
                alt="Watercolor version"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: watercolorOpacity,
                  transition: 'opacity 1.5s ease-in-out',
                }}
              />
            )}

            {/* Mask Overlay Layer */}
            {maskUrl && (
              <img
                src={maskUrl}
                alt="Object detection mask"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  opacity: maskOpacity,
                  transition: 'opacity 1s ease-in-out',
                  mixBlendMode: 'multiply',
                }}
              />
            )}
          </Box>

          {/* Phase Labels */}
          <Box sx={{ mt: 2 }}>
            {phase === 'mask' && (
              <>
                <Typography variant="h6" gutterBottom color="primary">
                  🎯 Objects Detected
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  AI is identifying items in your photo
                </Typography>
              </>
            )}

            {phase === 'watercolor' && (
              <>
                <Typography variant="h6" gutterBottom color="secondary">
                  🎨 Creating Watercolor
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Transforming photo into artistic illustration
                </Typography>
              </>
            )}

            {phase === 'complete' && (
              <>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{ color: 'success.main' }}
                >
                  ✨ Transformation Complete
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your item is ready for the library
                </Typography>
              </>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
