'use client';

import { CameraAlt as CameraIcon } from '@mui/icons-material';
import {
  Box,
  Button,
  Container,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState, useRef, useCallback, useEffect } from 'react';

interface SimpleAddItemClientProps {
  libraryId?: string;
}

export function SimpleAddItemClient({ libraryId }: SimpleAddItemClientProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [isCreatingItem, setIsCreatingItem] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    try {
      console.log('🎥 Starting camera initialization...');

      // First set camera active to render the video element
      setCameraActive(true);

      // Wait a bit for the component to re-render and create the video element
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if video ref is now available
      if (!videoRef.current) {
        console.error('❌ Video ref still not available after render');
        setError('Camera initialization failed - video element not found');
        setCameraActive(false);
        return;
      }

      console.log('🎥 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      console.log('✅ Camera stream obtained');

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      // Wait for video to load
      videoRef.current.onloadedmetadata = () => {
        console.log(
          '📹 Video metadata loaded, dimensions:',
          videoRef.current?.videoWidth,
          'x',
          videoRef.current?.videoHeight
        );
      };
    } catch (err) {
      console.error('❌ Camera access failed:', err);
      setError('Could not access camera. Please check permissions.');
      setCameraActive(false);
    }
  }, []);

  // Cleanup camera
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Capture photo and create item immediately
  const captureAndCreateItem = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Create data URL for preview
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImageUrl(dataUrl);
    cleanup(); // Stop camera

    // Convert to blob and create item
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setError('Failed to capture image');
          return;
        }

        setIsCreatingItem(true);

        try {
          const formData = new FormData();
          formData.append('image', blob, 'item.jpg');

          if (libraryId) {
            formData.append('libraryIds', JSON.stringify([libraryId]));
          }

          console.log('🚀 Creating item with watercolor...');
          const response = await fetch('/api/items/create-with-watercolor', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create item');
          }

          const result = await response.json();
          console.log('✅ Item created successfully:', result);

          // Navigate directly to the item details page
          router.push(`/stuff/${result.itemId}?new=true`);
        } catch (error) {
          console.error('❌ Failed to create item:', error);
          setError(
            error instanceof Error ? error.message : 'Failed to create item'
          );
          setIsCreatingItem(false);
        }
      },
      'image/jpeg',
      0.8
    );
  }, [libraryId, router, cleanup]);

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          onClick={() => {
            setError(null);
            setCapturedImageUrl(null);
            setIsCreatingItem(false);
          }}
        >
          Try Again
        </Button>
      </Container>
    );
  }

  if (isCreatingItem) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={64} sx={{ mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Creating your item...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Analyzing image and generating watercolor illustration
        </Typography>
        {capturedImageUrl && (
          <Box
            component="img"
            src={capturedImageUrl}
            alt="Captured item"
            sx={{
              width: 200,
              height: 200,
              objectFit: 'cover',
              borderRadius: 2,
              mt: 3,
            }}
          />
        )}
      </Container>
    );
  }

  if (capturedImageUrl) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Item Captured
        </Typography>
        <Box
          component="img"
          src={capturedImageUrl}
          alt="Captured item"
          sx={{
            width: 300,
            height: 300,
            objectFit: 'cover',
            borderRadius: 2,
            mb: 3,
          }}
        />
        <Button
          variant="contained"
          size="large"
          onClick={captureAndCreateItem}
          sx={{ mr: 2 }}
        >
          Create Item
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={() => {
            setCapturedImageUrl(null);
            initializeCamera();
          }}
        >
          Retake
        </Button>
      </Container>
    );
  }

  if (cameraActive) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Position Your Item
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Center the item in the viewfinder and tap to capture
        </Typography>

        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: 400,
            mx: 'auto',
            mb: 3,
            borderRadius: 2,
            overflow: 'hidden',
            minHeight: 300, // Ensure minimum height
            backgroundColor: '#f0f0f0', // Light background
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              backgroundColor: '#000', // Black background to make video visible
            }}
            onCanPlay={() => console.log('📹 Video can play')}
            onError={(e) => console.error('❌ Video error:', e)}
          />

          {/* Viewfinder overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              aspectRatio: '1',
              border: '2px solid white',
              borderRadius: 2,
              pointerEvents: 'none',
            }}
          />
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<CameraIcon />}
          onClick={captureAndCreateItem}
          sx={{ minWidth: 200 }}
        >
          Capture Item
        </Button>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        Add New Item
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Take a photo of your item to add it to the library
      </Typography>

      <Button
        variant="contained"
        size="large"
        startIcon={<CameraIcon />}
        onClick={initializeCamera}
        sx={{ minWidth: 200 }}
      >
        Start Camera
      </Button>
    </Container>
  );
}
