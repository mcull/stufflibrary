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

  console.log('🎬 AIVisualizationAnimation render:', {
    phase,
    maskUrl: !!maskUrl,
    watercolorUrl: !!watercolorUrl,
  });
  const [maskOpacity, setMaskOpacity] = useState(0);
  const [originalOpacity, setOriginalOpacity] = useState(1);
  const [watercolorOpacity, setWatercolorOpacity] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Start animation after a brief loading period, even if we don't have all data
    const startAnimation = () => {
      // Phase 1: Show object detection (if available) or skip to watercolor
      setTimeout(() => {
        if (maskUrl) {
          console.log('🎯 Starting mask phase');
          setPhase('mask');
          setMaskOpacity(1);
        } else if (watercolorUrl) {
          console.log('🎨 Starting watercolor phase (no mask)');
          setPhase('watercolor');
          setOriginalOpacity(0);
          setWatercolorOpacity(1);
        } else {
          // No AI data available, show completion immediately
          console.log('⚡ No AI data, completing immediately');
          setPhase('complete');
          onAnimationComplete?.();
          return;
        }
      }, 1000); // Give it a second to load

      // Phase 2: Cross-fade to watercolor (if available)
      setTimeout(
        () => {
          if (watercolorUrl) {
            setPhase('watercolor');
            setOriginalOpacity(0);
            setWatercolorOpacity(1);
            setMaskOpacity(0);
          } else {
            // No watercolor, but we might have shown mask, so complete
            setPhase('complete');
            onAnimationComplete?.();
            return;
          }
        },
        maskUrl ? 3000 : 2000
      ); // Longer delay, minimum 2s for watercolor

      // Phase 3: Complete (ensure minimum 4 seconds total)
      setTimeout(
        () => {
          console.log('✨ Animation complete, calling onAnimationComplete');
          setPhase('complete');
          onAnimationComplete?.();
        },
        maskUrl && watercolorUrl ? 5000 : 4000
      ); // Minimum 4s total animation
    };

    // Always start the animation, even without data
    startAnimation();
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
