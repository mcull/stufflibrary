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
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [shouldMirrorCamera, setShouldMirrorCamera] = useState(false);

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

      // Detect if we should mirror the camera
      // Mirror for webcam (desktop), don't mirror for phone cameras
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();

        // Check device and camera type for appropriate mirroring
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isMobile = isIOS || isAndroid;

        // Check if this is a front-facing camera (for future use)
        const _isFrontFacing = settings.facingMode === 'user';

        // Mirroring logic:
        // - Desktop webcams: always mirror (feels natural)
        // - iPhone front camera: don't mirror (matches iOS camera app behavior)
        // - Android front camera: don't mirror (matches Android camera app behavior)
        // - Mobile rear cameras: never mirror (environment facing)
        if (!isMobile) {
          // Desktop: mirror all cameras
          setShouldMirrorCamera(true);
        } else {
          // Mobile: never mirror (matches platform conventions)
          setShouldMirrorCamera(false);
        }
      } else {
        // Fallback: mirror only for desktop browsers
        const isMobileFallback =
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );
        setShouldMirrorCamera(!isMobileFallback);
      }

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

    console.log('📷 Canvas size:', canvas.width, 'x', canvas.height);
    console.log('📹 Video size:', video.videoWidth, 'x', video.videoHeight);

    // Draw video frame to canvas (flip horizontally if mirrored in preview)
    if (shouldMirrorCamera) {
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0);
      ctx.scale(-1, 1); // Reset the scale
    } else {
      ctx.drawImage(video, 0, 0);
    }

    console.log('🎨 Canvas drawn, checking image data...');
    const imageData = ctx.getImageData(
      0,
      0,
      Math.min(10, canvas.width),
      Math.min(10, canvas.height)
    );
    console.log('🖼️ Sample pixel data:', imageData.data.slice(0, 12));

    // Create data URL for display
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImageUrl(dataUrl);
    console.log('🖼️ Created image URL for display');

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
  }, [shouldMirrorCamera]);

  // Add item and navigate to metadata page
  const addItem = useCallback(async () => {
    if (!recognitionResult || !canvasRef.current) return;

    console.log('🏪 Starting add item process...');

    try {
      // Convert canvas to blob for storage
      canvasRef.current.toBlob(
        async (blob) => {
          if (!blob) {
            console.error('❌ Failed to create blob from canvas');
            return;
          }

          console.log('📦 Created blob for upload:', blob.size, 'bytes');

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

          console.log('📋 Creating form data...');
          const formData = new FormData();
          formData.append('image', blob, 'item.jpg');
          formData.append('name', recognitionResult.name);
          formData.append('category', recognitionResult.category);
          formData.append('branchId', effectiveBranchId);

          console.log('🚀 Uploading to API...');
          const response = await fetch('/api/items', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            console.error(
              '❌ API response not OK:',
              response.status,
              response.statusText
            );
            throw new Error('Failed to create item');
          }

          const responseData = await response.json();
          console.log('✅ Item created successfully:', responseData);
          const { itemId } = responseData;
          console.log('🔄 Navigating to item page:', itemId);
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

  // Check for auto-start on mount and clean up on unmount
  useEffect(() => {
    const checkPermissionAndAutoStart = async () => {
      try {
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({
            name: 'camera' as PermissionName,
          });
          if (permission.state === 'granted') {
            console.log(
              '🎥 Camera permission already granted, auto-starting...'
            );
            await startCamera();
          }
        }
      } catch {
        console.log(
          '🔍 Permission API not available or failed, staying on permission screen'
        );
      }
    };

    checkPermissionAndAutoStart();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

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
                transform: shouldMirrorCamera ? 'scaleX(-1)' : 'none',
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
                    top: -50,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 600,
                    textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                  }}
                >
                  Center your item in this area
                </Box>
              </Box>
            </Box>

            {/* Tap item instruction */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: 'rgba(0, 0, 0, 0.85)',
                color: 'white',
                px: 4,
                py: 2,
                borderRadius: 25,
                pointerEvents: 'none',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
                  letterSpacing: '0.5px',
                }}
              >
                Tap Item
              </Typography>
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
            {capturedImageUrl && (
              <Paper
                elevation={3}
                sx={{
                  maxWidth: 300,
                  mx: 'auto',
                  mb: 3,
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: 'grey.100',
                }}
              >
                <img
                  src={capturedImageUrl}
                  alt="Captured item"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    maxHeight: '300px',
                    objectFit: 'contain',
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
        px: 1,
        pt: 1,
        pb: 2,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexShrink: 0 }}>
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
          justifyContent: state === 'streaming' ? 'flex-start' : 'center',
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
