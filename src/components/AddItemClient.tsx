'use client';

import {
  ArrowBack as ArrowBackIcon,
  CameraAlt as CameraIcon,
  Check as CheckIcon,
  ErrorOutline as ErrorIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useRef, useState, useCallback, useEffect } from 'react';

import { brandColors } from '@/theme/brandTokens';

type CaptureState =
  | 'permission'
  | 'streaming'
  | 'capturing'
  | 'analyzing'
  | 'recognized'
  | 'error';

interface RecognitionResult {
  name: string;
  confidence: number;
  category: string;
}

interface AddItemClientProps {
  branchId?: string;
}

export function AddItemClient({ branchId }: AddItemClientProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<CaptureState>('permission');
  const [error, setError] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] =
    useState<RecognitionResult | null>(null);

  // Request camera permission and start stream
  const startCamera = useCallback(async () => {
    console.log('🎥 Starting camera...');

    try {
      console.log('📱 Requesting media stream...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use rear camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      console.log('✅ Stream obtained:', stream);
      console.log('📹 Stream tracks:', stream.getTracks().length);

      // Store the stream first, then change state to render video element
      streamRef.current = stream;
      console.log('🔄 Setting state to streaming...');
      setState('streaming');
    } catch (err) {
      console.error('❌ Error accessing camera:', err);
      setError(
        'Unable to access camera. Please ensure you have granted camera permissions.'
      );
      setState('error');
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Capture photo and analyze
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setState('capturing');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to blob for analysis
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setError('Failed to capture image');
          setState('error');
          return;
        }

        setState('analyzing');

        try {
          // Create form data for API request
          const formData = new FormData();
          formData.append('image', blob, 'capture.jpg');

          const response = await fetch('/api/analyze-item', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Analysis failed');
          }

          const result = await response.json();

          if (result.recognized && result.name) {
            setRecognitionResult({
              name: result.name,
              confidence: result.confidence || 0,
              category: result.category || 'other',
            });
            setState('recognized');
          } else {
            setError(
              'We couldn&apos;t identify this object. Please try again with better lighting or a clearer view of the item.'
            );
            setState('error');
          }
        } catch (err) {
          console.error('Error analyzing image:', err);
          setError('Failed to analyze the image. Please try again.');
          setState('error');
        }
      },
      'image/jpeg',
      0.8
    );
  }, []);

  // Add item and navigate to metadata page
  const addItem = useCallback(async () => {
    if (!recognitionResult || !canvasRef.current) return;

    try {
      // Convert canvas to blob for storage
      canvasRef.current.toBlob(
        async (blob) => {
          if (!blob) return;

          // If no branchId provided, try to find or create a default branch
          let effectiveBranchId = branchId;
          if (!effectiveBranchId) {
            const branchResponse = await fetch('/api/branches');
            if (branchResponse.ok) {
              const { branches } = await branchResponse.json();
              if (branches && branches.length > 0) {
                // Use the first available branch
                effectiveBranchId = branches[0].id;
              }
            }

            // If still no branch, we need to create one
            if (!effectiveBranchId) {
              setError(
                'No branch available. Please create a branch first from the lobby.'
              );
              setState('error');
              return;
            }
          }

          const formData = new FormData();
          formData.append('image', blob, 'item.jpg');
          formData.append('name', recognitionResult.name);
          formData.append('category', recognitionResult.category);
          formData.append('branchId', effectiveBranchId);

          const response = await fetch('/api/items', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to create item');
          }

          const { itemId } = await response.json();
          router.push(`/stuff/${itemId}?new=true`);
        },
        'image/jpeg',
        0.8
      );
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item. Please try again.');
      setState('error');
    }
  }, [recognitionResult, branchId, router]);

  // Retry capture
  const retryCapture = useCallback(() => {
    setError(null);
    setRecognitionResult(null);
    setState('streaming');
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const renderContent = () => {
    console.log('🎯 Current state:', state);
    switch (state) {
      case 'permission':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CameraIcon
              sx={{ fontSize: 64, color: brandColors.inkBlue, mb: 2 }}
            />
            <Typography variant="h5" gutterBottom>
              Add Item with Camera
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}
            >
              Take a photo of your item and we&apos;ll help identify it. Make
              sure the item is well-lit and fills the frame.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={startCamera}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
              }}
            >
              Start Camera
            </Button>
          </Box>
        );

      case 'streaming':
        console.log(
          '🎬 Rendering streaming state, videoRef:',
          !!videoRef.current
        );
        return (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '60vh',
              minHeight: '300px',
              maxHeight: '500px',
              mx: 'auto',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'black',
            }}
          >
            <video
              ref={(el) => {
                console.log('🎥 Video element ref set:', !!el);
                if (el && streamRef.current) {
                  videoRef.current = el;
                  console.log('🎬 Setting video source from ref...');
                  el.srcObject = streamRef.current;

                  // Add event listeners for debugging
                  el.onloadedmetadata = () => {
                    console.log('📊 Video metadata loaded');
                    console.log(
                      'Video dimensions:',
                      el.videoWidth,
                      'x',
                      el.videoHeight
                    );
                  };

                  el.onplay = () => {
                    console.log('▶️ Video started playing');
                  };

                  el.oncanplay = () => {
                    console.log('🎯 Video can play');
                  };

                  el.onerror = (e) => {
                    console.error('❌ Video error:', e);
                  };

                  el.onloadstart = () => {
                    console.log('🔄 Video load started');
                  };

                  console.log('📐 Video element setup complete');
                }
              }}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onClick={capturePhoto}
            />

            {/* Guidance overlay */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 2,
                pointerEvents: 'none',
              }}
            >
              {/* Top overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '10%',
                  bgcolor: 'rgba(0, 0, 0, 0.75)',
                }}
              />

              {/* Bottom overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '10%',
                  bgcolor: 'rgba(0, 0, 0, 0.75)',
                }}
              />

              {/* Left overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '10%',
                  bottom: '10%',
                  left: 0,
                  width: '10%',
                  bgcolor: 'rgba(0, 0, 0, 0.75)',
                }}
              />

              {/* Right overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '10%',
                  bottom: '10%',
                  right: 0,
                  width: '10%',
                  bgcolor: 'rgba(0, 0, 0, 0.75)',
                }}
              />

              {/* Guidance rectangle border */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '10%',
                  left: '10%',
                  right: '10%',
                  bottom: '10%',
                  border: '2px solid white',
                  borderRadius: 2,
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.3)',
                }}
              >
                {/* Instruction text */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -40,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'white',
                    fontSize: '14px',
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}
                >
                  Center your item in this area
                </Box>
              </Box>
            </Box>

            {/* Tap to capture instruction */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                px: 3,
                py: 1,
                borderRadius: 2,
                pointerEvents: 'none',
              }}
            >
              <Typography variant="body2">Tap to capture</Typography>
            </Box>
          </Box>
        );

      case 'capturing':
      case 'analyzing':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={64} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {state === 'capturing' ? 'Capturing...' : 'Analyzing item...'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {state === 'analyzing' && 'This may take a few seconds'}
            </Typography>
          </Box>
        );

      case 'recognized':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {canvasRef.current && (
              <Paper
                elevation={3}
                sx={{
                  maxWidth: 300,
                  mx: 'auto',
                  mb: 3,
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </Paper>
            )}

            <CheckIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Item Recognized!
            </Typography>
            <Typography variant="h6" sx={{ mb: 3, color: brandColors.inkBlue }}>
              {recognitionResult?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Confidence:{' '}
              {Math.round((recognitionResult?.confidence || 0) * 100)}%
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={retryCapture}
                sx={{ borderRadius: 2 }}
              >
                Try Again
              </Button>
              <Button
                variant="contained"
                onClick={addItem}
                sx={{ borderRadius: 2 }}
              >
                Add Item
              </Button>
            </Box>
          </Box>
        );

      case 'error':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Oops!
            </Typography>
            <Alert severity="error" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              {error}
            </Alert>
            <Button
              variant="contained"
              onClick={retryCapture}
              sx={{ borderRadius: 2 }}
            >
              Try Again
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        py: 2,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexShrink: 0 }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">Add Item</Typography>
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {renderContent()}
      </Box>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </Container>
  );
}
