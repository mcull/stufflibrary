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
  TextField,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useRef, useState, useCallback, useEffect } from 'react';
import type { SyntheticEvent } from 'react';

import { brandColors } from '@/theme/brandTokens';

import { CollectionSelectionModal } from './CollectionSelectionModal';

// Animated "Illustrating item..." overlay component
function IllustratingOverlay() {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4); // Cycles through 0, 1, 2, 3
    }, 600); // Change every 600ms for smooth animation

    return () => clearInterval(interval);
  }, []);

  const getDots = (count: number) => {
    return '.'.repeat(count);
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '80%',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(4px)',
        borderRadius: 1,
        py: 1.5,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <CircularProgress size={16} sx={{ color: brandColors.inkBlue }} />
      <Typography
        variant="body2"
        sx={{
          color: brandColors.inkBlue,
          fontWeight: 500,
          fontSize: '0.875rem',
        }}
      >
        Illustrating item{getDots(dotCount)}
      </Typography>
    </Box>
  );
}

type CaptureState =
  | 'permission'
  | 'streaming'
  | 'capturing'
  | 'illustrating' // New state: recognition done, watercolor processing in background
  | 'recognized'
  | 'uploaded'
  | 'error';

type AddMode = 'camera' | 'describe';

interface ConceptOption {
  conceptId: string;
  watercolorUrl: string | null;
  watercolorThumbUrl: string | null;
  sourceType: 'OPENVERSE' | 'GENERATIVE';
  generatedName?: string | null;
  sourceAttribution?: Record<string, unknown> | null;
}

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

  const [mode, setMode] = useState<AddMode>('camera');
  const [state, setState] = useState<CaptureState>('permission');
  const [error, setError] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] =
    useState<RecognitionResult | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [shouldMirrorCamera, setShouldMirrorCamera] = useState(false);
  const [uploadedItem, setUploadedItem] = useState<UploadedItem | null>(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draftItemId, setDraftItemId] = useState<string | null>(null);
  const [isGeneratingWatercolor, setIsGeneratingWatercolor] = useState(false);
  const [watercolorUrl, setWatercolorUrl] = useState<string | null>(null);
  const [showWatercolor, setShowWatercolor] = useState(false);
  const [showHintInput, setShowHintInput] = useState(false);
  const [nameHint, setNameHint] = useState('');
  const [conceptBatchId, setConceptBatchId] = useState<string | null>(null);
  const [conceptOptions, setConceptOptions] = useState<ConceptOption[]>([]);
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  const [conceptError, setConceptError] = useState<string | null>(null);
  const [describeName, setDescribeName] = useState('');
  const [describeDescription, setDescribeDescription] = useState('');
  const [describeBrand, setDescribeBrand] = useState('');
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(
    null
  );
  const [isCreatingFromConcept, setIsCreatingFromConcept] = useState(false);

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

        // New clean approach: Create draft item immediately
        console.log('📸 Image captured, creating draft item...');
        setIsAnalyzing(true);

        try {
          // Step 1: Create draft item immediately with photo
          const draftFormData = new FormData();
          draftFormData.append('image', blob, 'capture.jpg');

          const draftResponse = await fetch('/api/items/create-draft', {
            method: 'POST',
            body: draftFormData,
          });

          if (!draftResponse.ok) {
            throw new Error('Failed to create draft item');
          }

          const draftResult = await draftResponse.json();
          const itemId = draftResult.itemId;
          setDraftItemId(itemId);
          console.log('✅ Draft item created:', itemId);

          // Step 2: Get AI analysis
          const analysisFormData = new FormData();
          analysisFormData.append('image', blob, 'capture.jpg');
          // Include hint if available (empty string means no hint)
          if (nameHint) {
            analysisFormData.append('nameHint', nameHint);
          }

          const analysisResponse = await fetch('/api/analyze-item', {
            method: 'POST',
            body: analysisFormData,
          });

          if (!analysisResponse.ok) {
            throw new Error('Analysis failed');
          }

          const analysisResult = await analysisResponse.json();
          console.log('🔍 Analysis result:', analysisResult);

          if (analysisResult.recognized && analysisResult.name) {
            // Step 3: Update item with analysis results
            const updateAnalysisResponse = await fetch(
              '/api/items/update-analysis',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  itemId: itemId,
                  name: analysisResult.name,
                  description: analysisResult.description,
                  category: analysisResult.category,
                }),
              }
            );

            if (updateAnalysisResponse.ok) {
              console.log('✅ Item updated with analysis');
            }

            // Set recognition results for UI
            setRecognitionResult({
              name: analysisResult.name,
              description: analysisResult.description || '',
              confidence: analysisResult.confidence || 0,
              category: analysisResult.category || 'other',
            });

            // Store the real item ID
            setUploadedItem({
              id: itemId,
              name: analysisResult.name,
            });

            setIsAnalyzing(false);
            setState('recognized');

            // Step 4: Start watercolor generation with UI updates
            setIsGeneratingWatercolor(true);

            fetch('/api/items/render-watercolor', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ itemId: itemId }),
            })
              .then(async (watercolorResponse) => {
                if (watercolorResponse.ok) {
                  const watercolorResult = await watercolorResponse.json();
                  console.log(
                    '🎨 Watercolor generated:',
                    watercolorResult.watercolorUrl
                  );

                  // Update the watercolor URL in state and show it
                  setWatercolorUrl(watercolorResult.watercolorUrl);
                  setTimeout(() => {
                    setShowWatercolor(true);
                    setIsGeneratingWatercolor(false);
                  }, 100);
                } else {
                  console.error('❌ Watercolor generation failed');
                  setIsGeneratingWatercolor(false);
                }
              })
              .catch((error) => {
                console.error('❌ Watercolor generation failed:', error);
                setIsGeneratingWatercolor(false);
              });
          } else {
            setError('Could not identify the item. Please try again.');
            setState('error');
          }
        } catch (err) {
          console.error('❌ Error in new item creation flow:', err);
          setError('Failed to create item. Please try again.');
          setState('error');
          setIsAnalyzing(false);
        }
      },
      'image/jpeg',
      0.8
    );
  }, [shouldMirrorCamera, nameHint]);

  // Add item and navigate to metadata page
  const addItem = useCallback(async () => {
    if (!recognitionResult || !draftItemId) {
      console.error('❌ Missing recognition result or draft item ID');
      return;
    }

    console.log('🏪 Activating item:', draftItemId);

    try {
      // Activate the draft item
      const response = await fetch('/api/items/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: draftItemId,
          libraryIds: libraryId ? [libraryId] : [],
        }),
      });

      if (!response.ok) {
        console.error(
          '❌ API response not OK:',
          response.status,
          response.statusText
        );
        throw new Error('Failed to activate item');
      }

      const responseData = await response.json();
      console.log('✅ Item activated successfully:', responseData);
      const { itemId, item } = responseData;

      // Store uploaded item info
      setUploadedItem({
        id: itemId,
        name: item.name,
      });

      setState('uploaded');
      setShowLibraryModal(true);
    } catch (err) {
      console.error('❌ Error activating item:', err);
      setError('Failed to add item. Please try again.');
      setState('error');
    }
  }, [recognitionResult, draftItemId, libraryId]);

  // Retry capture
  const retryCapture = useCallback(() => {
    setError(null);
    setRecognitionResult(null);
    setDraftItemId(null);
    setIsGeneratingWatercolor(false);
    setWatercolorUrl(null);
    setShowWatercolor(false);
    setShowHintInput(false);
    setNameHint('');
    setState('streaming');
  }, []);

  // Retry analysis with hint on the existing captured image
  const retryWithHint = useCallback(async () => {
    if (!capturedImageUrl || !nameHint.trim()) {
      return;
    }

    console.log('🔄 Retrying analysis with hint:', nameHint);
    setIsAnalyzing(true);
    setState('capturing');
    setError(null);

    try {
      // Convert data URL back to blob
      const response = await fetch(capturedImageUrl);
      const blob = await response.blob();

      // If we don't have a draft item yet, create one
      let itemId: string = draftItemId || '';
      if (!itemId) {
        const draftFormData = new FormData();
        draftFormData.append('image', blob, 'capture.jpg');

        const draftResponse = await fetch('/api/items/create-draft', {
          method: 'POST',
          body: draftFormData,
        });

        if (!draftResponse.ok) {
          throw new Error('Failed to create draft item');
        }

        const draftResult = await draftResponse.json();
        itemId = draftResult.itemId as string;
        setDraftItemId(itemId);
        console.log('✅ Draft item created:', itemId);
      }

      // Analyze with hint
      const analysisFormData = new FormData();
      analysisFormData.append('image', blob, 'capture.jpg');
      analysisFormData.append('nameHint', nameHint.trim());

      const analysisResponse = await fetch('/api/analyze-item', {
        method: 'POST',
        body: analysisFormData,
      });

      if (!analysisResponse.ok) {
        throw new Error('Analysis failed');
      }

      const analysisResult = await analysisResponse.json();
      console.log('🔍 Analysis result with hint:', analysisResult);

      if (analysisResult.recognized && analysisResult.name) {
        // Update item with analysis results
        const updateAnalysisResponse = await fetch(
          '/api/items/update-analysis',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: itemId,
              name: analysisResult.name,
              description: analysisResult.description,
              category: analysisResult.category,
            }),
          }
        );

        if (updateAnalysisResponse.ok) {
          console.log('✅ Item updated with analysis');
        }

        // Set recognition results for UI
        setRecognitionResult({
          name: analysisResult.name,
          description: analysisResult.description || '',
          confidence: analysisResult.confidence || 0,
          category: analysisResult.category || 'other',
        });

        setUploadedItem({
          id: itemId,
          name: analysisResult.name,
        });

        setIsAnalyzing(false);
        setState('recognized');
        setShowHintInput(false);

        // Start watercolor generation
        setIsGeneratingWatercolor(true);

        fetch('/api/items/render-watercolor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: itemId }),
        })
          .then(async (watercolorResponse) => {
            if (watercolorResponse.ok) {
              const watercolorResult = await watercolorResponse.json();
              console.log(
                '🎨 Watercolor generated:',
                watercolorResult.watercolorUrl
              );
              setWatercolorUrl(watercolorResult.watercolorUrl);
              setTimeout(() => {
                setShowWatercolor(true);
                setIsGeneratingWatercolor(false);
              }, 100);
            } else {
              console.error('❌ Watercolor generation failed');
              setIsGeneratingWatercolor(false);
            }
          })
          .catch((error) => {
            console.error('❌ Watercolor generation failed:', error);
            setIsGeneratingWatercolor(false);
          });
      } else {
        setError(
          'Still could not identify the item with that hint. Please try a new photo or different hint.'
        );
        setState('error');
        setIsAnalyzing(false);
      }
    } catch (err) {
      console.error('❌ Error retrying with hint:', err);
      setError('Failed to analyze with hint. Please try again.');
      setState('error');
      setIsAnalyzing(false);
    }
  }, [capturedImageUrl, nameHint, draftItemId]);

  const handleModeChange = useCallback(
    (_event: SyntheticEvent, newMode: AddMode) => {
      setMode(newMode);
      if (newMode === 'camera') {
        setError(null);
        setState('permission');
      }
    },
    []
  );

  const handleGenerateConcepts = useCallback(async () => {
    if (!describeName.trim()) {
      setConceptError('Please provide a name for your item.');
      return;
    }

    setIsGeneratingConcepts(true);
    setConceptError(null);
    setSelectedConceptId(null);
    setConceptOptions([]);

    try {
      const response = await fetch('/api/items/suggest-visuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: describeName.trim(),
          description: describeDescription.trim() || undefined,
          brand: describeBrand.trim() || undefined,
          discardBatchId: conceptBatchId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message =
          data.message || data.error || 'Failed to generate visuals';
        throw new Error(message);
      }

      const data = await response.json();
      setConceptBatchId(data.batchId || null);
      const options = (data.options as ConceptOption[] | undefined) ?? [];
      setConceptOptions(options);

      if (options.length === 0) {
        setConceptError(
          'No visuals found. Try adding more detail or a brand name.'
        );
      }
    } catch (conceptErr) {
      console.error('Concept generation failed:', conceptErr);
      setConceptError(
        conceptErr instanceof Error
          ? conceptErr.message
          : 'Failed to generate visuals'
      );
    } finally {
      setIsGeneratingConcepts(false);
    }
  }, [describeName, describeDescription, describeBrand, conceptBatchId]);

  const handleCreateFromConcept = useCallback(async () => {
    if (!selectedConceptId) {
      setConceptError('Please choose one of the illustrations first.');
      return;
    }

    setIsCreatingFromConcept(true);
    setConceptError(null);

    try {
      const response = await fetch('/api/items/create-from-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId: selectedConceptId,
          name: describeName.trim(),
          description: describeDescription.trim() || undefined,
          libraryIds: libraryId ? [libraryId] : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to add item');
      }

      const data = await response.json();
      const newItem = data.item as { id: string; name: string } | undefined;
      if (newItem) {
        setUploadedItem({ id: newItem.id, name: newItem.name });
      }

      setConceptBatchId(null);
      setConceptOptions([]);
      setSelectedConceptId(null);
      setDescribeName('');
      setDescribeDescription('');
      setDescribeBrand('');
      setShowLibraryModal(true);
    } catch (conceptErr) {
      console.error('Failed to create item from concept:', conceptErr);
      setConceptError(
        conceptErr instanceof Error
          ? conceptErr.message
          : 'Failed to add item from concept'
      );
    } finally {
      setIsCreatingFromConcept(false);
    }
  }, [selectedConceptId, describeName, describeDescription, libraryId]);

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

  useEffect(() => {
    if (mode === 'describe') {
      stopCamera();
    } else {
      setConceptError(null);
      setConceptOptions([]);
      setSelectedConceptId(null);
    }
  }, [mode, stopCamera]);

  const renderDescribeContent = () => {
    const helperText =
      'Share a clear name and a few details. We will keep your library safe and suggest watercolor illustrations for you to choose from.';

    return (
      <Box sx={{ py: 4, pb: 6 }}>
        <Typography variant="h5" gutterBottom>
          Describe Your Item
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 520, mb: 3 }}
        >
          {helperText}
        </Typography>

        <Stack spacing={2.5} sx={{ maxWidth: 520 }}>
          <TextField
            label="Item name"
            value={describeName}
            onChange={(event) => setDescribeName(event.target.value)}
            required
            placeholder="e.g. DeWalt cordless drill"
            fullWidth
          />
          <TextField
            label="Brand (optional)"
            value={describeBrand}
            onChange={(event) => setDescribeBrand(event.target.value)}
            placeholder="e.g. DeWalt, KitchenAid, Trek"
            fullWidth
          />
          <TextField
            label="Details (optional)"
            value={describeDescription}
            onChange={(event) => setDescribeDescription(event.target.value)}
            placeholder="Share notable features, color, size, or accessories"
            fullWidth
            multiline
            minRows={3}
          />

          {conceptError && (
            <Alert severity="error" onClose={() => setConceptError(null)}>
              {conceptError}
            </Alert>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="contained"
              onClick={handleGenerateConcepts}
              disabled={isGeneratingConcepts}
            >
              {isGeneratingConcepts ? 'Sketching...' : 'Generate Visuals'}
            </Button>
            {conceptOptions.length > 0 && (
              <Button
                variant="outlined"
                onClick={handleGenerateConcepts}
                disabled={isGeneratingConcepts}
              >
                Regenerate
              </Button>
            )}
          </Stack>
        </Stack>

        {isGeneratingConcepts && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mt: 4,
              color: brandColors.inkBlue,
            }}
          >
            <CircularProgress size={20} sx={{ color: brandColors.inkBlue }} />
            <Typography variant="body2">
              Creating watercolor options…
            </Typography>
          </Box>
        )}

        {conceptOptions.length > 0 && (
          <Box sx={{ mt: 4, pb: 6 }}>
            <Typography variant="subtitle1" gutterBottom>
              Choose your favorite illustration
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(3, minmax(0, 1fr))',
                },
                alignItems: 'stretch',
              }}
            >
              {conceptOptions.map((option, index) => {
                const imageSrc =
                  option.watercolorThumbUrl || option.watercolorUrl;
                const isSelected = option.conceptId === selectedConceptId;
                const attributionRecord = option.sourceAttribution as {
                  attribution?: unknown;
                } | null;
                const attributionText =
                  attributionRecord &&
                  typeof attributionRecord.attribution === 'string'
                    ? attributionRecord.attribution
                    : null;
                const optionNames = ['one', 'two', 'three', 'four', 'five'];
                const optionLabel =
                  index < optionNames.length
                    ? `Option ${optionNames[index]}`
                    : `Option ${index + 1}`;
                const optionDescription =
                  option.generatedName || describeName || 'Illustration';
                return (
                  <Paper
                    key={option.conceptId}
                    elevation={isSelected ? 6 : 1}
                    sx={{
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: isSelected
                        ? `2px solid ${brandColors.inkBlue}`
                        : `1px solid ${brandColors.softGray}`,
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                      transform: isSelected ? 'translateY(-4px)' : 'none',
                      maxWidth: { xs: '100%', md: 220 },
                      width: '100%',
                      justifySelf: 'center',
                    }}
                    onClick={() => setSelectedConceptId(option.conceptId)}
                  >
                    <Box
                      sx={{
                        px: 2,
                        py: 1.5,
                        borderBottom: `1px solid ${brandColors.softGray}`,
                        backgroundColor: brandColors.warmCream,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, textTransform: 'uppercase' }}
                      >
                        {optionLabel}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ lineHeight: 1.3 }}
                      >
                        {optionDescription}
                      </Typography>
                    </Box>
                    <Box
                      component="img"
                      src={imageSrc || ''}
                      alt={optionDescription}
                      sx={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        objectFit: 'cover',
                        backgroundColor: brandColors.softGray,
                        height: { xs: 'auto', md: 180 },
                      }}
                    />
                    <Box sx={{ p: 2 }}>
                      {attributionText && (
                        <Typography variant="caption" color="text.secondary">
                          {attributionText}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>

            {conceptOptions.length > 0 && conceptOptions.length < 3 && (
              <Alert severity="info" sx={{ mt: 3 }}>
                Only {conceptOptions.length} illustration
                {conceptOptions.length === 1 ? '' : 's'} found so far. Try
                adding more detail or regenerate for new options.
              </Alert>
            )}

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ mt: 4 }}
              alignItems={{ xs: 'stretch', sm: 'center' }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={handleCreateFromConcept}
                disabled={isCreatingFromConcept || !selectedConceptId}
              >
                {isCreatingFromConcept ? 'Saving…' : 'Add Item'}
              </Button>
              <Typography variant="body2" color="text.secondary">
                We will store your choice, clean up unused drafts, and route you
                to library selection.
              </Typography>
            </Stack>
          </Box>
        )}
      </Box>
    );
  };

  const renderContent = () => {
    if (mode === 'describe') {
      return renderDescribeContent();
    }

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
                bgcolor: 'white',
                color: 'black',
                px: 3,
                py: 1.5,
                borderRadius: 22,
                pointerEvents: 'none',
                border: '2px solid rgba(0, 0, 0, 0.1)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 600,
                  fontSize: '1rem',
                  textShadow: 'none',
                  letterSpacing: '0.5px',
                  color: 'black',
                }}
              >
                Tap to add
              </Typography>
            </Box>
          </Box>
        );

      case 'capturing':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={64} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Capturing photo...
            </Typography>
          </Box>
        );

      case 'recognized':
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
                <Box
                  component="img"
                  src={capturedImageUrl}
                  alt="Captured item"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: showWatercolor ? 0 : 1,
                    transition: 'opacity 1.5s ease-in-out',
                    ...(isGeneratingWatercolor && {
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': {
                          opacity: showWatercolor ? 0 : 1,
                        },
                        '50%': {
                          opacity: showWatercolor ? 0 : 0.7,
                        },
                      },
                    }),
                  }}
                />

                {/* Watercolor image (when ready) */}
                {watercolorUrl && (
                  <Box
                    component="img"
                    src={watercolorUrl}
                    alt="Watercolor illustration"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: showWatercolor ? 1 : 0,
                      transition: 'opacity 1.5s ease-in-out',
                    }}
                  />
                )}

                {/* Illustrating overlay - only show when generating watercolor */}
                {isGeneratingWatercolor && <IllustratingOverlay />}
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
                disabled={isGeneratingWatercolor}
                sx={{ borderRadius: 2 }}
              >
                {isGeneratingWatercolor ? 'Illustrating...' : 'Add Item'}
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
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Oops!
            </Typography>
            <Alert severity="error" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              {error}
            </Alert>

            {/* Show captured image if available */}
            {capturedImageUrl && (
              <Box
                sx={{
                  mb: 3,
                  maxWidth: 300,
                  mx: 'auto',
                  borderRadius: 2,
                  overflow: 'hidden',
                  boxShadow: 2,
                }}
              >
                <img
                  src={capturedImageUrl}
                  alt="Captured item"
                  style={{ width: '100%', display: 'block' }}
                />
              </Box>
            )}

            {/* Show hint input or hint input button */}
            {showHintInput ? (
              <Box sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
                <Typography
                  variant="body2"
                  sx={{ mb: 2, color: 'text.secondary' }}
                >
                  Give us a hint about what this item is, and we&apos;ll try
                  again with this photo.
                </Typography>
                <TextField
                  fullWidth
                  label="What is this item?"
                  placeholder="e.g., gas can, radial saw, ladder..."
                  value={nameHint}
                  onChange={(e) => setNameHint(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && nameHint.trim()) {
                      retryWithHint();
                    }
                  }}
                  autoFocus
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowHintInput(false);
                      setNameHint('');
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={retryWithHint}
                    disabled={!nameHint.trim() || isAnalyzing}
                    sx={{ borderRadius: 2 }}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Try with Hint'}
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant="outlined"
                  onClick={retryCapture}
                  sx={{ borderRadius: 2 }}
                >
                  Take New Photo
                </Button>
                {capturedImageUrl && (
                  <Button
                    variant="contained"
                    onClick={() => setShowHintInput(true)}
                    sx={{ borderRadius: 2 }}
                  >
                    Try Again with Hint
                  </Button>
                )}
              </Box>
            )}
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
        pb: 4,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexShrink: 0 }}>
        <IconButton
          onClick={() => router.back()}
          sx={{
            mr: 1,
            display: { xs: 'none', md: 'flex' }, // Hide on mobile
          }}
        >
          <ArrowBackIcon />
        </IconButton>
      </Box>

      <Tabs
        value={mode}
        onChange={handleModeChange}
        variant="fullWidth"
        sx={{ mb: 2 }}
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab label="Use Camera" value="camera" />
        <Tab label="Describe Instead" value="describe" />
      </Tabs>

      {/* Content */}
      <Box
        sx={{
          flex: mode === 'describe' ? '0 0 auto' : '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent:
            mode === 'describe' || state === 'streaming'
              ? 'flex-start'
              : 'center',
          position: mode === 'describe' ? 'static' : 'relative',
          overflowY: mode === 'describe' ? 'visible' : 'hidden',
          pb: mode === 'describe' ? 4 : 0,
        }}
      >
        {renderContent()}
      </Box>

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Library Selection Modal */}
      {uploadedItem && (
        <CollectionSelectionModal
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
