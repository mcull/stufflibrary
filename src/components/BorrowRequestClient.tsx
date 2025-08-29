'use client';

import {
  ArrowBack as ArrowBackIcon,
  Videocam as VideocamIcon,
  Stop as StopIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useRouter } from 'next/navigation';
import { useRef, useState, useCallback, useEffect } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface Item {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  owner: {
    id: string;
    name: string | null;
    image: string | null;
  };

  stuffType: {
    displayName: string;
    category: string;
    iconPath: string;
  } | null;
}

interface BorrowRequestClientProps {
  item: Item;
}

type RequestState =
  | 'intro'
  | 'recording'
  | 'recorded'
  | 'playing'
  | 'confirming'
  | 'submitting'
  | 'success'
  | 'error';

export function BorrowRequestClient({ item }: BorrowRequestClientProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const autoStopTimeoutRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
  }, []);

  const [state, setState] = useState<RequestState>('intro');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [promiseChecked, setPromiseChecked] = useState(false);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setState('recording');
      console.log('📱 Requesting camera access...');

      // Try different camera configurations for mobile compatibility
      const constraints = [
        // First try: front-facing camera with specific constraints
        {
          video: {
            facingMode: 'user',
            width: { ideal: 480, min: 320 },
            height: { ideal: 360, min: 240 },
            frameRate: { ideal: 24, max: 30 },
          },
          audio: true,
        },
        // Fallback 1: any camera with basic constraints
        {
          video: {
            width: { ideal: 480, min: 320 },
            height: { ideal: 360, min: 240 },
          },
          audio: true,
        },
        // Fallback 2: minimal constraints
        {
          video: true,
          audio: true,
        },
        // Fallback 3: video only
        {
          video: true,
        },
      ];

      let stream = null;
      let lastError = null;

      for (let i = 0; i < constraints.length; i++) {
        try {
          console.log(
            `📱 Trying camera configuration ${i + 1}:`,
            constraints[i]
          );
          stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
          console.log('✅ Camera access successful with configuration:', i + 1);

          // Detect if we're using front-facing camera
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const settings = videoTrack.getSettings();
            // Check if facingMode indicates front camera or if it's the first constraint (which requests front camera)
            const constraint = constraints[i];
            const videoConstraint = constraint?.video;
            const isFront = Boolean(
              settings.facingMode === 'user' ||
                (i === 0 &&
                  videoConstraint &&
                  typeof videoConstraint === 'object' &&
                  videoConstraint !== null &&
                  'facingMode' in videoConstraint &&
                  videoConstraint.facingMode === 'user')
            );
            setIsFrontCamera(isFront);
            console.log('📱 Front-facing camera detected:', isFront);
          }

          break;
        } catch (err) {
          lastError = err;
          console.warn(`❌ Camera configuration ${i + 1} failed:`, err);
          if (i === constraints.length - 1) {
            throw err;
          }
        }
      }

      if (!stream) {
        throw lastError;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log('✅ Video element playing');
      }
    } catch (err) {
      console.error('❌ Failed to access camera:', err);

      // Provide specific error messages based on the error type
      let errorMessage = 'Unable to access camera. ';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage +=
            'Please allow camera and microphone permissions in your browser settings.';
          // Add mobile-specific guidance
          if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            errorMessage +=
              ' On mobile, you may need to refresh the page and try again.';
          }
        } else if (err.name === 'NotFoundError') {
          errorMessage += 'No camera found on this device.';
        } else if (err.name === 'NotSupportedError') {
          errorMessage +=
            'Camera access is not supported in this browser. Try using Chrome or Safari.';
        } else if (err.name === 'NotReadableError') {
          errorMessage +=
            'Camera is already in use by another application. Please close other apps using the camera.';
        } else {
          errorMessage +=
            'Please ensure you have granted camera and microphone permissions.';
        }
      } else {
        errorMessage +=
          'Please ensure you have granted camera and microphone permissions.';
      }

      // Add HTTPS warning for localhost
      if (location.protocol === 'http:' && location.hostname !== 'localhost') {
        errorMessage +=
          ' Note: Camera access requires HTTPS on non-localhost domains.';
      }

      setError(errorMessage);
      setState('error');
    }
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    recordedChunksRef.current = [];

    // Try different codecs based on browser support
    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
        }
      }
    }

    console.log('📹 Using MediaRecorder with mimeType:', mimeType);
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType,
    });

    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      console.log(
        '📹 MediaRecorder stopped, chunks collected:',
        recordedChunksRef.current.length
      );

      const blob = new Blob(recordedChunksRef.current, {
        type: mimeType,
      });

      console.log('🎬 Created video blob:', {
        size: blob.size,
        type: blob.type,
      });

      setVideoBlob(blob);
      const blobUrl = URL.createObjectURL(blob);
      setVideoBlobUrl(blobUrl);

      console.log('🔗 Created blob URL:', blobUrl);

      // Clear the video element's srcObject to avoid conflicts
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setState('recorded');
      // Clean up
      stopStream();
      clearTimers();
    };

    mediaRecorder.start();

    // Recording timer
    recordingStartRef.current = Date.now();
    setRecordingTime(0);
    timerIntervalRef.current = window.setInterval(() => {
      if (recordingStartRef.current)
        setRecordingTime(
          Math.floor((Date.now() - recordingStartRef.current) / 1000)
        );
    }, 1000);

    // Auto-stop after ~15 seconds to keep uploads small
    autoStopTimeoutRef.current = window.setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      clearTimers();
    }, 15000);
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    clearTimers();
  }, [clearTimers]);

  // Re-record video
  const reRecord = useCallback(() => {
    if (videoBlobUrl) {
      URL.revokeObjectURL(videoBlobUrl);
      setVideoBlobUrl(null);
      setVideoBlob(null);
    }
    clearTimers();
    stopStream();
    setRecordingTime(0);
    setIsFrontCamera(false); // Reset front camera detection
    startCamera();
  }, [videoBlobUrl, startCamera, clearTimers, stopStream]);

  // Continue to confirmation
  const continueToConfirm = useCallback(() => {
    setState('confirming');
  }, []);

  // Submit borrow request
  const submitRequest = useCallback(async () => {
    if (!videoBlob || !returnDate || !promiseChecked) return;

    setState('submitting');

    try {
      // Client-side size guard (~9MB)
      const maxSize = 9 * 1024 * 1024;
      if (videoBlob.size > maxSize) {
        throw new Error(
          'Video too large. Please re-record a shorter clip (~10–15 seconds).'
        );
      }

      // Step 1: create borrow request (Mux flow)
      const meta = new FormData();
      meta.append('useMux', 'true');
      meta.append('itemId', item.id);
      meta.append('promisedReturnBy', returnDate.toISOString());
      meta.append(
        'promiseText',
        `I promise to return the ${item.name} by ${returnDate.toLocaleDateString()}`
      );

      const createRes = await fetch('/api/borrow-requests', {
        method: 'POST',
        body: meta,
      });
      if (!createRes.ok) {
        const text = await createRes.text();
        throw new Error(text || 'Failed to create request');
      }
      const { borrowRequestId } = await createRes.json();
      // Step 2: get Mux upload URL
      const uploadRes = await fetch('/api/mux/create-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowRequestId }),
      });
      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        throw new Error(text || 'Failed to initialize video upload');
      }
      const { uploadUrl } = await uploadRes.json();

      // Step 3: upload to Mux via XHR to get progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', 'video/webm');
        setUploadProgress(0);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(pct);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (HTTP ${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new Error('Upload aborted'));
        xhr.send(videoBlob);
      });

      // Success — asset will process; owner is notified when ready via webhook
      setUploadProgress(100);
      setState('success');
    } catch (err) {
      console.error('Failed to submit request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit request');
      setState('error');
    } finally {
      xhrRef.current = null;
    }
  }, [videoBlob, returnDate, promiseChecked, item]);

  const suggestedScript = `Hey ${item.owner.name || 'there'}, I&apos;d love to borrow your ${item.name} for a few days. ${item.description ? `I need it for ${item.description.toLowerCase().includes('ing') ? item.description.toLowerCase() : 'my project'}` : 'I have a project that would benefit from using it'}. I can pick it up anytime after 5:30 on weeknights, or before noon on weekends. Thanks!`;

  const renderContent = () => {
    switch (state) {
      case 'intro':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ fontWeight: 600, color: brandColors.charcoal }}
            >
              Record Your Borrow Request
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: brandColors.charcoal, opacity: 0.7, mb: 4 }}
            >
              Record a short (10–15s) video selfie to introduce yourself and
              explain why you&apos;d like to borrow this item.
            </Typography>

            {/* Item Info */}
            <Card sx={{ maxWidth: 400, mx: 'auto', mb: 4 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {item.name}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 2 }}
                >
                  owned by {item.owner.name}
                </Typography>
                {item.imageUrl && (
                  <Box
                    sx={{
                      aspectRatio: '1',
                      backgroundImage: `url(${item.imageUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: 1,
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Suggested Script */}
            <Card
              sx={{
                maxWidth: 600,
                mx: 'auto',
                mb: 4,
                bgcolor: brandColors.warmCream,
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Suggested Script
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontStyle: 'italic',
                    color: brandColors.charcoal,
                    lineHeight: 1.6,
                  }}
                >
                  &ldquo;{suggestedScript}&rdquo;
                </Typography>
              </CardContent>
            </Card>

            <Button
              variant="contained"
              size="large"
              onClick={startCamera}
              startIcon={<VideocamIcon />}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
              }}
            >
              Start Recording
            </Button>
          </Box>
        );

      case 'recording':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ fontWeight: 600, color: brandColors.charcoal }}
            >
              Recording Your Request
            </Typography>

            {/* Video Preview */}
            <Box
              sx={{
                position: 'relative',
                maxWidth: 640,
                mx: 'auto',
                mb: 3,
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'black',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  // Mirror the video horizontally when using front-facing camera
                  transform: isFrontCamera ? 'scaleX(-1)' : 'none',
                }}
              />

              {/* Recording indicator */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'rgba(255, 0, 0, 0.8)',
                  color: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'white',
                    mr: 1,
                    animation: 'blink 1s infinite',
                  }}
                />
                REC {recordingTime}s
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={startRecording}
                startIcon={<VideocamIcon />}
                sx={{ borderRadius: 2 }}
              >
                Start Recording
              </Button>
              <Button
                variant="outlined"
                onClick={stopRecording}
                startIcon={<StopIcon />}
                sx={{ borderRadius: 2 }}
              >
                Stop Recording
              </Button>
            </Box>
          </Box>
        );

      case 'recorded':
      case 'playing':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ fontWeight: 600, color: brandColors.charcoal }}
            >
              Review Your Request
            </Typography>

            {/* Video Playback */}
            <Box
              sx={{
                maxWidth: 640,
                mx: 'auto',
                mb: 3,
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'black',
              }}
            >
              {videoBlobUrl ? (
                <video
                  src={videoBlobUrl}
                  controls
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                  onLoadStart={() => console.log('🎬 Video loading started')}
                  onLoadedData={() => console.log('🎬 Video data loaded')}
                  onError={(e) => console.error('🎬 Video error:', e)}
                />
              ) : (
                <Box
                  sx={{
                    height: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <CircularProgress color="inherit" />
                </Box>
              )}
            </Box>

            <Box
              sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 4 }}
            >
              <Button
                variant="outlined"
                onClick={reRecord}
                startIcon={<RefreshIcon />}
                sx={{ borderRadius: 2 }}
              >
                Re-record
              </Button>
              <Button
                variant="contained"
                onClick={continueToConfirm}
                sx={{ borderRadius: 2 }}
              >
                Looks Good
              </Button>
            </Box>
          </Box>
        );

      case 'confirming':
        return (
          <Box sx={{ py: 4 }}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                fontWeight: 600,
                color: brandColors.charcoal,
                textAlign: 'center',
                mb: 4,
              }}
            >
              Confirm Your Request
            </Typography>

            {/* Return Date */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  When will you return it?
                </Typography>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Promised return date"
                    value={returnDate}
                    onChange={setReturnDate}
                    minDate={new Date()}
                    sx={{ width: '100%' }}
                  />
                </LocalizationProvider>
              </CardContent>
            </Card>

            {/* Promise Checkbox */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={promiseChecked}
                      onChange={(e) => setPromiseChecked(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body1">
                      I promise to return the <strong>{item.name}</strong> by{' '}
                      {returnDate
                        ? returnDate.toLocaleDateString()
                        : '[select date]'}{' '}
                      in the same condition I received it.
                    </Typography>
                  }
                />
              </CardContent>
            </Card>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={() => setState('recorded')}
                sx={{ borderRadius: 2 }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={submitRequest}
                disabled={!promiseChecked || !returnDate}
                startIcon={<SendIcon />}
                sx={{ borderRadius: 2 }}
              >
                Send Request
              </Button>
            </Box>
          </Box>
        );

      case 'submitting':
        return (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            {typeof uploadProgress === 'number' ? (
              <>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{ height: 10, borderRadius: 1, mb: 2 }}
                />
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Uploading video: {uploadProgress}%
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => {
                    if (xhrRef.current) {
                      xhrRef.current.abort();
                      setUploadProgress(null);
                      setState('recorded');
                    }
                  }}
                  sx={{ mb: 2, borderRadius: 2 }}
                >
                  Cancel Upload
                </Button>
              </>
            ) : (
              <CircularProgress size={64} sx={{ mb: 2 }} />
            )}
            <Typography variant="h6" gutterBottom>
              Sending Your Request...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This may take a moment to upload your video
            </Typography>
          </Box>
        );

      case 'success':
        return (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h4" sx={{ color: 'success.main', mb: 2 }}>
              🎉
            </Typography>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ fontWeight: 600, color: brandColors.charcoal }}
            >
              Request Sent!
            </Typography>
            <Typography
              variant="body1"
              sx={{ mb: 4, color: brandColors.charcoal, opacity: 0.7 }}
            >
              {item.owner.name} will receive your video request via SMS and
              email. You&apos;ll be notified when they respond.
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/lobby')}
              sx={{ borderRadius: 2 }}
            >
              Back to Lobby
            </Button>
          </Box>
        );

      case 'error':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
            <Button
              variant="contained"
              onClick={() => {
                setError(null);
                setState('intro');
              }}
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      stopStream();
      if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
    };
  }, [clearTimers, stopStream, videoBlobUrl]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton
          onClick={() => router.back()}
          sx={{ mr: 2 }}
          aria-label="Go back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: brandColors.charcoal,
          }}
        >
          Borrow Request
        </Typography>
      </Box>

      {/* Content */}
      {renderContent()}

      {/* Hidden canvas for future signature functionality */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Add blink animation for recording indicator */}
      <style jsx global>{`
        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </Container>
  );
}
