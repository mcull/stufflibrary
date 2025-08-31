'use client';

import {
  ArrowBack as ArrowBackIcon,
  CameraAlt as CameraIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
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

import { AIVisualizationAnimation } from './AIVisualizationAnimation';
import { LibrarySelectionModal } from './LibrarySelectionModal';

type CaptureState =
  | 'permission'
  | 'streaming'
  | 'capturing'
  | 'analyzing'
  | 'illustrating' // New state: recognition done, watercolor processing in background
  | 'recognized'
  | 'uploaded'
  | 'error';

interface RecognitionResult {
  name: string;
  description: string;
  confidence: number;
  category: string;
}

interface UploadedItem {
  id: string;
  name: string;
}

interface AddItemClientProps {
  libraryId?: string;
}

export function AddItemClient({ libraryId }: AddItemClientProps) {
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
  const [uploadedItem, setUploadedItem] = useState<UploadedItem | null>(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [watercolorData, setWatercolorData] = useState<{
    maskUrl?: string;
    watercolorUrl?: string;
    segmentationMasks?: Array<{
      label: string;
      confidence: number;
    }>;
  } | null>(null);

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

    // Calculate the viewfinder area (center 80% of video, matching the overlay)
    const margin = 0.1; // 10% margin on all sides
    const cropWidth = video.videoWidth * (1 - 2 * margin);
    const cropHeight = video.videoHeight * (1 - 2 * margin);

    // Make the crop area square by using the smaller dimension
    const cropSize = Math.min(cropWidth, cropHeight);
    const centerX = video.videoWidth / 2;
    const centerY = video.videoHeight / 2;
    const squareCropX = centerX - cropSize / 2;
    const squareCropY = centerY - cropSize / 2;

    // Set canvas size to square crop area
    canvas.width = cropSize;
    canvas.height = cropSize;

    console.log('📷 Canvas size:', canvas.width, 'x', canvas.height);
    console.log('📹 Video size:', video.videoWidth, 'x', video.videoHeight);
    console.log('✂️ Crop area:', squareCropX, squareCropY, cropSize, cropSize);

    // Draw cropped video frame to canvas (flip horizontally if mirrored in preview)
    if (shouldMirrorCamera) {
      ctx.scale(-1, 1);
      ctx.drawImage(
        video,
        squareCropX,
        squareCropY,
        cropSize,
        cropSize,
        -cropSize,
        0,
        cropSize,
        cropSize
      );
      ctx.scale(-1, 1); // Reset the scale
    } else {
      ctx.drawImage(
        video,
        squareCropX,
        squareCropY,
        cropSize,
        cropSize,
        0,
        0,
        cropSize,
        cropSize
      );
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

        // Skip analyzing state - go directly to recognized with loading
        console.log('📸 Image captured, starting analysis...');
        setIsAnalyzing(true);

        try {
          // Create form data for combined AI analysis and visualization
          const formData = new FormData();
          formData.append('image', blob, 'capture.jpg');

          const response = await fetch('/api/analyze-and-visualize', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Analysis failed');
          }

          const result = await response.json();
          console.log('🎨 AI Analysis result:', result);

          if (result.recognized && result.name) {
            // Set recognition results
            setRecognitionResult({
              name: result.name,
              description: result.description || '',
              confidence: result.confidence || 0,
              category: result.category || 'other',
            });

            // Store previewId for polling
            setPreviewId(result.previewId);

            // Analysis complete, show results
            setIsAnalyzing(false);

            // Check if watercolor is processing in background
            if (result.watercolorProcessing) {
              console.log(
                '🎨 Recognition complete, moving to recognized state with background processing...'
              );
              setState('recognized');
              // Start polling for watercolor completion
              startWatercolorPolling(result.previewId);
            } else {
              // Legacy path: watercolor data already available
              const watercolorInfo = {
                maskUrl: result.maskUrl,
                watercolorUrl: result.watercolorUrl,
                segmentationMasks: result.segmentationMasks || [],
              };
              console.log('🎯 Setting watercolor data:', watercolorInfo);
              setWatercolorData(watercolorInfo);
              setState('recognized');
            }
          } else if (result.prohibited) {
            setError(
              result.error ||
                'This item is not permitted in our community sharing library. Please try a different household item.'
            );
            setState('error');
          } else {
            setError(
              "We couldn't identify this object. Please try again with better lighting or a clearer view of the item."
            );
            setState('error');
          }
        } catch (err) {
          console.error('Error analyzing image:', err);
          setError('Failed to analyze the image. Please try again.');
          setState('error');
        } finally {
          setIsAnalyzing(false);
        }
      },
      'image/jpeg',
      0.8
    );
  }, [shouldMirrorCamera]);

  // Start polling for watercolor completion
  const startWatercolorPolling = useCallback(async (previewId: string) => {
    console.log('🔄 Starting watercolor polling for', previewId);

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/watercolor-status/${previewId}`);
        const result = await response.json();

        if (result.ready) {
          console.log('🎨 Watercolor ready!', result);
          clearInterval(pollInterval);

          if (result.error) {
            console.warn('⚠️ Watercolor processing failed:', result.error);
            // Still move to recognized state with original photo
            setState('recognized');
          } else {
            // Set watercolor data - this will trigger the cross-fade animation
            console.log('🎨 Watercolor ready, triggering cross-fade...');
            setWatercolorData({
              maskUrl: result.maskUrl,
              watercolorUrl: result.watercolorUrl,
              segmentationMasks: result.segmentationMasks || [],
            });
            // State stays 'recognized' but now with watercolor data
          }
        }
      } catch (error) {
        console.error('❌ Error polling watercolor status:', error);
        // Continue polling - don't break the flow
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 2 minutes to prevent infinite polling
    setTimeout(() => {
      clearInterval(pollInterval);
      console.warn('⏰ Watercolor polling timed out');
      setState('recognized'); // Move to recognized state even without watercolor
    }, 120000);
  }, []);

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

          console.log('📋 Creating form data...');
          const formData = new FormData();
          formData.append('image', blob, 'item.jpg');
          formData.append('name', recognitionResult.name);
          formData.append('description', recognitionResult.description);
          formData.append('category', recognitionResult.category);

          // Only add libraryIds if provided (from specific library context)
          if (libraryId) {
            formData.append('libraryIds', JSON.stringify([libraryId]));
          }

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
          const { itemId, item } = responseData;

          // Store uploaded item info
          setUploadedItem({
            id: itemId,
            name: item.name,
          });

          setState('uploaded');
          setShowLibraryModal(true);
        },
        'image/jpeg',
        0.8
      );
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item. Please try again.');
      setState('error');
    }
  }, [recognitionResult, libraryId]);

  // Retry capture
  const retryCapture = useCallback(() => {
    setError(null);
    setRecognitionResult(null);
    setState('streaming');
  }, []);

  // Handle library selection completion
  const handleLibrarySelectionComplete = useCallback(
    (_selectedLibraryIds: string[]) => {
      setShowLibraryModal(false);

      if (uploadedItem) {
        // Navigate to the item page
        router.push(`/stuff/${uploadedItem.id}?new=true`);
      }
    },
    [uploadedItem, router]
  );

  // Handle library modal close
  const handleLibraryModalClose = useCallback(() => {
    setShowLibraryModal(false);

    if (uploadedItem) {
      // Navigate to the item page even if user closed modal
      router.push(`/stuff/${uploadedItem.id}?new=true`);
    }
  }, [uploadedItem, router]);

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
          <AIVisualizationAnimation
            originalImageUrl={capturedImageUrl || ''}
            maskUrl={watercolorData?.maskUrl}
            watercolorUrl={watercolorData?.watercolorUrl}
            onAnimationComplete={() => {
              // Animation complete, move to recognized state
              if (recognitionResult) {
                setState('recognized');
              }
            }}
          />
        );

      case 'recognized':
        const isWatercolorReady = !!watercolorData?.watercolorUrl;
        const isProcessingWatercolor = previewId && !isWatercolorReady;

        // If still analyzing, show analyzing state
        if (isAnalyzing) {
          return (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={64} sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Analyzing image...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                AI is identifying your item
              </Typography>
            </Box>
          );
        }

        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {/* Square image container with cross-fade animation */}
            {capturedImageUrl && (
              <Paper
                elevation={3}
                sx={{
                  width: 300,
                  height: 300,
                  mx: 'auto',
                  mb: 3,
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: 'grey.100',
                  position: 'relative',
                }}
              >
                {/* Original image */}
                <img
                  src={capturedImageUrl}
                  alt="Captured item"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: isWatercolorReady ? 0 : 1,
                    transition: 'opacity 1.5s ease-in-out',
                  }}
                />

                {/* Watercolor image (when ready) */}
                {watercolorData?.watercolorUrl && (
                  <img
                    src={watercolorData.watercolorUrl}
                    alt="Watercolor illustration"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: isWatercolorReady ? 1 : 0,
                      transition: 'opacity 1.5s ease-in-out',
                    }}
                  />
                )}
              </Paper>
            )}

            {/* Success icon and title */}
            <CheckCircleIcon
              sx={{ fontSize: 48, color: 'success.main', mb: 2 }}
            />
            <Typography variant="h5" gutterBottom>
              Item Recognized!
            </Typography>
            <Typography variant="h6" sx={{ mb: 1, color: brandColors.inkBlue }}>
              {recognitionResult?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Confidence:{' '}
              {Math.round((recognitionResult?.confidence || 0) * 100)}%
            </Typography>

            {/* Live analysis status */}
            {isProcessingWatercolor && (
              <Box
                sx={{
                  mb: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                }}
              >
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Illustrating item...
                </Typography>
              </Box>
            )}

            {isWatercolorReady && (
              <Typography variant="body2" color="success.main" sx={{ mb: 3 }}>
                ✨ Watercolor illustration ready!
              </Typography>
            )}

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
                disabled={isProcessingWatercolor}
                sx={{ borderRadius: 2 }}
              >
                {isProcessingWatercolor ? 'Processing...' : 'Add Item'}
              </Button>
            </Box>
          </Box>
        );

      case 'uploaded':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Item Uploaded Successfully!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Choose which libraries to add your item to...
            </Typography>
            <CircularProgress size={24} />
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

      {/* Library Selection Modal */}
      {uploadedItem && (
        <LibrarySelectionModal
          open={showLibraryModal}
          itemName={uploadedItem.name}
          itemId={uploadedItem.id}
          onClose={handleLibraryModalClose}
          onComplete={handleLibrarySelectionComplete}
        />
      )}
    </Container>
  );
}
