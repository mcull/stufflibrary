'use client';

import {
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
  watercolorUrl?: string | null;
  watercolorThumbUrl?: string | null;
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
  refSource?: 'library' | 'mystuff' | null;
  refLibraryId?: string | null;
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

export function BorrowRequestClient({
  item,
  refSource = null,
  refLibraryId = null,
}: BorrowRequestClientProps) {
  const router = useRouter();

  // Helper function to get the best available image URL (prioritize watercolor)
  const getDisplayImageUrl = () => {
    return item.watercolorUrl || item.watercolorThumbUrl || item.imageUrl;
  };
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
  // Elapsed recording time in seconds (float)
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [promiseChecked, setPromiseChecked] = useState(false);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const beep20PlayedRef = useRef<boolean>(false);
  const beep25PlayedRef = useRef<boolean>(false);

  const playBeep = useCallback(
    (frequency: number = 880, durationMs: number = 120) => {
      try {
        const Ctx: any =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.value = 0.08;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          ctx.close();
        }, durationMs);
      } catch {
        /* noop */
      }
    },
    []
  );

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setState('recording');
      console.log('📱 Requesting camera and microphone access...');

      // First, explicitly check for microphone permissions to provide better UX
      try {
        const permissionStatus = await navigator.permissions?.query({
          name: 'microphone' as PermissionName,
        });
        if (permissionStatus?.state === 'denied') {
          console.warn(
            '🎤 Microphone permissions denied - user will need to enable in browser settings'
          );
        }
      } catch {
        console.log(
          '🎤 Permission API not available, will rely on getUserMedia prompts'
        );
      }

      // Try different camera configurations for mobile compatibility
      const constraints = [
        // First try: front-facing camera with specific constraints + audio
        {
          video: {
            facingMode: 'user',
            width: { ideal: 480, min: 320 },
            height: { ideal: 360, min: 240 },
            frameRate: { ideal: 24, max: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        },
        // Fallback 1: any camera with basic constraints + audio
        {
          video: {
            width: { ideal: 480, min: 320 },
            height: { ideal: 360, min: 240 },
          },
          audio: true,
        },
        // Fallback 2: minimal constraints with audio
        {
          video: true,
          audio: true,
        },
      ];

      let stream = null;
      let lastError = null;
      let hasAudio = false;

      for (let i = 0; i < constraints.length; i++) {
        try {
          console.log(
            `📱 Trying camera configuration ${i + 1}:`,
            constraints[i]
          );
          stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
          console.log('✅ Camera access successful with configuration:', i + 1);

          // Check if audio track is present and enabled
          const audioTracks = stream.getAudioTracks();
          hasAudio =
            audioTracks.length > 0 && (audioTracks[0]?.enabled ?? false);
          console.log('🎤 Audio track status:', {
            hasAudioTrack: audioTracks.length > 0,
            audioEnabled: audioTracks[0]?.enabled,
            hasAudio,
          });

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

      // Require both video and audio - don't proceed without microphone
      if (!hasAudio) {
        console.warn('⚠️ No microphone access - blocking recording');
        throw new Error('NotAllowedError');
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        console.log('✅ Video element playing');
      }
    } catch (err) {
      console.error('❌ Failed to access camera:', err);

      // Friendly message for permission errors
      let errorMessage =
        'Right now, all borrow requests are done by video to keep it real and keep it human. If you want to continue, please enable video and mic access for your browser!';

      if (err instanceof Error) {
        if (err.name === 'NotFoundError') {
          errorMessage =
            "No camera found on this device. You'll need a camera to record your borrow request video.";
        } else if (err.name === 'NotSupportedError') {
          errorMessage =
            'Camera access is not supported in this browser. Try using Chrome or Safari to record your video request.';
        } else if (err.name === 'NotReadableError') {
          errorMessage =
            'Your camera is already in use by another app. Please close other apps using the camera and try again.';
        }
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
    setIsRecording(true);
    beep20PlayedRef.current = false;
    beep25PlayedRef.current = false;

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

    // Configure MediaRecorder with bitrate constraints to reduce file size
    const recorderOptions: MediaRecorderOptions = {
      mimeType,
      // Set moderate bitrate to balance quality and file size
      // ~500kbps video + ~64kbps audio = ~564kbps total
      videoBitsPerSecond: 500000, // 500 kbps for video
      audioBitsPerSecond: 64000, // 64 kbps for audio
    };

    const mediaRecorder = new MediaRecorder(streamRef.current, recorderOptions);

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

      setIsRecording(false);
      setState('recorded');
      // Clean up
      stopStream();
      clearTimers();
    };

    mediaRecorder.start();

    // Count-up timer with milliseconds, auto-stop at 30s
    recordingStartRef.current = performance.now();
    setRecordingTime(0);
    // Update roughly every 25ms for a smooth ms counter
    timerIntervalRef.current = window.setInterval(() => {
      if (recordingStartRef.current) {
        const elapsedMs = performance.now() - recordingStartRef.current;
        const elapsedSec = elapsedMs / 1000;
        setRecordingTime(elapsedSec);
        if (elapsedSec >= 20 && !beep20PlayedRef.current) {
          playBeep(740, 100);
          beep20PlayedRef.current = true;
        }
        if (elapsedSec >= 25 && !beep25PlayedRef.current) {
          playBeep(880, 120);
          beep25PlayedRef.current = true;
        }
      }
    }, 25);

    // Auto-stop after 30 seconds
    autoStopTimeoutRef.current = window.setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      clearTimers();
    }, 30000);
  }, [clearTimers, stopStream, playBeep]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
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
    setIsRecording(false);
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
      // Client-side size guard with better error messaging and increased limit
      const maxSize = 15 * 1024 * 1024; // Increased to 15MB for better UX
      if (videoBlob.size > maxSize) {
        const sizeMB = Math.round((videoBlob.size / (1024 * 1024)) * 10) / 10;
        throw new Error(
          `Video file is ${sizeMB}MB, which is too large. Please try recording a shorter clip (aim for 10-30 seconds) or check your camera quality settings.`
        );
      }

      // Log video details for debugging
      const sizeMB = Math.round((videoBlob.size / (1024 * 1024)) * 100) / 100;
      console.log(
        `📏 Video size: ${sizeMB}MB, Duration: ~${Math.ceil(recordingTime)}s`
      );

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
  }, [videoBlob, returnDate, promiseChecked, item, recordingTime]);

  const suggestedScript = `Hey ${item.owner.name || 'there'}, I'd love to borrow your ${item.name} for a few days. ${item.description ? `I need it for ${item.description.toLowerCase().includes('ing') ? item.description.toLowerCase() : 'my project'}` : 'I have a project that would benefit from using it'}. I can pick it up anytime after 5:30 on weeknights, or before noon on weekends. Thanks!`;

  const renderContent = () => {
    switch (state) {
      case 'intro':
        return (
          <Box sx={{ textAlign: 'center' }}>
            {/* Instructions moved up */}
            <Typography
              variant="body1"
              sx={{ color: brandColors.charcoal, opacity: 0.7, mb: 3 }}
            >
              Record a short (10-30 second) video selfie to introduce yourself
              and explain why you&apos;d like to borrow this item.
            </Typography>

            {/* Suggested Script in italics */}
            <Typography
              variant="body1"
              sx={{
                fontStyle: 'italic',
                color: brandColors.charcoal,
                lineHeight: 1.6,
                mb: 4,
                px: 2,
              }}
            >
              &ldquo;{suggestedScript}&rdquo;
            </Typography>

            {/* Start Recording button */}
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
                mb: 4,
              }}
            >
              Start Recording
            </Button>

            {/* Fixed-size container for camera view or permissions warning */}
            <Box
              sx={{
                maxWidth: 640,
                mx: 'auto',
                aspectRatio: '4/3',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body2" color="white">
                Camera will appear here
              </Typography>
            </Box>

            {/* Item Info moved to bottom */}
            <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
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
                {getDisplayImageUrl() && (
                  <Box
                    sx={{
                      aspectRatio: '1',
                      backgroundImage: `url(${getDisplayImageUrl()})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: 1,
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </Box>
        );

      case 'recording':
        return (
          <Box sx={{ textAlign: 'center' }}>
            {/* Instructions moved up */}
            <Typography
              variant="body1"
              sx={{ color: brandColors.charcoal, opacity: 0.7, mb: 3 }}
            >
              Record a short (10-30 second) video selfie to introduce yourself
              and explain why you&apos;d like to borrow this item.
            </Typography>

            {/* Suggested Script in italics */}
            <Typography
              variant="body1"
              sx={{
                fontStyle: 'italic',
                color: brandColors.charcoal,
                lineHeight: 1.6,
                mb: 4,
                px: 2,
              }}
            >
              &ldquo;{suggestedScript}&rdquo;
            </Typography>

            {/* Recording button */}
            <Button
              variant="contained"
              size="large"
              onClick={isRecording ? stopRecording : startRecording}
              startIcon={isRecording ? <StopIcon /> : <VideocamIcon />}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                mb: 4,
              }}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>

            {/* Fixed-size container for camera view */}
            <Box
              sx={{
                position: 'relative',
                maxWidth: 640,
                mx: 'auto',
                aspectRatio: '4/3',
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
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  // Mirror the video horizontally when using front-facing camera
                  transform: isFrontCamera ? 'scaleX(-1)' : 'none',
                }}
              />

              {/* Recording indicator */}
              {isRecording && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'rgba(0, 0, 0, 0.8)',
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
                  REC
                </Box>
              )}

              {/* Count-up timer with color thresholds (green <20s, yellow <25s, red >=25s) */}
              {isRecording && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    bgcolor: 'rgba(0, 0, 0, 0.8)',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                  }}
                >
                  {(() => {
                    const totalMs = Math.floor(recordingTime * 1000);
                    const minutes = Math.floor(totalMs / 60000);
                    const seconds = Math.floor((totalMs % 60000) / 1000);
                    const ms4 = Math.floor((totalMs % 1000) * 10); // 4 digits
                    const color =
                      recordingTime < 20
                        ? '#2E7D32'
                        : recordingTime < 25
                          ? '#F9A825'
                          : '#C62828';
                    const text = `${String(minutes).padStart(2, '0')}:${String(
                      seconds
                    ).padStart(2, '0')}:${String(ms4).padStart(4, '0')}`;
                    return (
                      <Typography
                        component="span"
                        sx={{
                          color,
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          letterSpacing: 1,
                        }}
                      >
                        {text}
                      </Typography>
                    );
                  })()}
                </Box>
              )}
            </Box>

            {/* Item Info moved to bottom */}
            <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
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
                {getDisplayImageUrl() && (
                  <Box
                    sx={{
                      aspectRatio: '1',
                      backgroundImage: `url(${getDisplayImageUrl()})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: 1,
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </Box>
        );

      case 'recorded':
      case 'playing':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box sx={{ maxWidth: 640, mx: 'auto', width: '100%' }}>
              <Typography
                variant="h3"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  color: brandColors.charcoal,
                  textAlign: 'left',
                }}
              >
                Review Your Request
              </Typography>
            </Box>

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
              onClick={() => router.push('/stacks')}
              sx={{ borderRadius: 2 }}
            >
              Back to Lobby
            </Button>
          </Box>
        );

      case 'error':
        return (
          <Box sx={{ textAlign: 'center' }}>
            {/* Instructions moved up */}
            <Typography
              variant="body1"
              sx={{ color: brandColors.charcoal, opacity: 0.7, mb: 3 }}
            >
              Record a short (10-30 second) video selfie to introduce yourself
              and explain why you&apos;d like to borrow this item.
            </Typography>

            {/* Suggested Script in italics */}
            <Typography
              variant="body1"
              sx={{
                fontStyle: 'italic',
                color: brandColors.charcoal,
                lineHeight: 1.6,
                mb: 4,
                px: 2,
              }}
            >
              &ldquo;{suggestedScript}&rdquo;
            </Typography>

            {/* Try Again button */}
            <Button
              variant="contained"
              size="large"
              onClick={() => {
                setError(null);
                setState('intro');
                startCamera();
              }}
              startIcon={<VideocamIcon />}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                mb: 4,
              }}
            >
              Try Again
            </Button>

            {/* Fixed-size container for permissions warning */}
            <Box
              sx={{
                maxWidth: 640,
                mx: 'auto',
                aspectRatio: '4/3',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 3,
              }}
            >
              <Alert
                severity="error"
                sx={{ width: '100%', bgcolor: 'rgba(255,255,255,0.9)' }}
              >
                {error}
              </Alert>
            </Box>

            {/* Item Info moved to bottom */}
            <Card sx={{ maxWidth: 400, mx: 'auto', mt: 4 }}>
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
                {getDisplayImageUrl() && (
                  <Box
                    sx={{
                      aspectRatio: '1',
                      backgroundImage: `url(${getDisplayImageUrl()})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: 1,
                    }}
                  />
                )}
              </CardContent>
            </Card>
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
      {/* Breadcrumbs */}
      <Box sx={{ mb: 2, color: 'text.secondary' }}>
        <Typography
          component="span"
          onClick={() => router.push('/stacks')}
          sx={{
            opacity: 0.6,
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          Home
        </Typography>
        <Typography component="span" sx={{ opacity: 0.4, mx: 1 }}>
          /
        </Typography>
        {refSource === 'library' && refLibraryId ? (
          <>
            <Typography
              component="span"
              onClick={() => router.push(`/library/${refLibraryId}`)}
              sx={{
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Current Library
            </Typography>
            <Typography component="span" sx={{ opacity: 0.4, mx: 1 }}>
              /
            </Typography>
          </>
        ) : null}
        <Typography
          component="span"
          onClick={() => {
            const params = new URLSearchParams();
            if (refSource === 'library' && refLibraryId) {
              params.set('src', 'library');
              params.set('lib', refLibraryId);
            } else if (refSource === 'mystuff') {
              params.set('src', 'mystuff');
            }
            router.push(`/stuff/${item.id}?${params.toString()}`);
          }}
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
        >
          Item Detail
        </Typography>
        <Typography component="span" sx={{ opacity: 0.4, mx: 1 }}>
          /
        </Typography>
        <Typography component="span" sx={{ fontWeight: 500 }}>
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
