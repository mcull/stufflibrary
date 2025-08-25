'use client';

import {
  ArrowBack,
  ArrowForward,
  CameraAlt,
  Close,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useState, useRef } from 'react';
import { useFormContext } from 'react-hook-form';

// import { STUFF_CATEGORIES } from '@/data/stuffCategories';
import { brandColors } from '@/theme/brandTokens';

import type { ProfileFormData } from '../ProfileWizard';

interface ProfileStep2Props {
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  profilePicturePreviewUrl?: string | null;
}

interface ImageVerificationResult {
  approved: boolean;
  reason?: string;
  confidence: 'high' | 'medium' | 'low';
}

export function ProfileStep2({ onNext, onBack }: ProfileStep2Props) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProfileFormData>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<
    'pending' | 'verifying' | 'approved' | 'rejected' | null
  >(null);
  const [_verificationResult, setVerificationResult] =
    useState<ImageVerificationResult | null>(null);

  const _profilePicture = watch('profilePicture');
  const profilePictureUrl = watch('profilePictureUrl');

  const currentImageUrl = previewUrl || profilePictureUrl;

  const verifyImageWithAI = async (
    file: File
  ): Promise<ImageVerificationResult> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/verify-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to verify image');
    }

    return response.json();
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setUploadError(null);
    setVerificationStatus(null);
    setVerificationResult(null);

    // Validate file type
    if (
      !['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(
        file.type
      )
    ) {
      setUploadError('Please select a JPEG, PNG, or WebP image');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image must be less than 10MB');
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setVerificationStatus('pending');

    try {
      // Start verification
      setVerificationStatus('verifying');
      const result = await verifyImageWithAI(file);
      setVerificationResult(result);

      if (result.approved) {
        setVerificationStatus('approved');
        setValue('profilePicture', file);
      } else {
        setVerificationStatus('rejected');
        setUploadError(
          result.reason || 'Image does not meet our community guidelines'
        );
      }
    } catch (error) {
      console.error('Image verification error:', error);
      setVerificationStatus('rejected');
      setUploadError(
        'Unable to verify image. Please try again or choose a different photo.'
      );
    }
  };

  const handleRemoveImage = () => {
    setValue('profilePicture', null as any);
    setValue('profilePictureUrl', undefined);
    setPreviewUrl(null);
    setUploadError(null);
    setVerificationStatus(null);
    setVerificationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getVerificationMessage = () => {
    switch (verificationStatus) {
      case 'verifying':
        return {
          type: 'info' as const,
          message: 'Verifying your photo...',
        };
      case 'approved':
        return {
          type: 'success' as const,
          message: 'Great! Your photo looks good.',
        };
      case 'rejected':
        return {
          type: 'error' as const,
          message: uploadError || 'Photo verification failed',
        };
      default:
        return null;
    }
  };

  const verificationMessage = getVerificationMessage();

  return (
    <Box sx={{ minHeight: '600px' }}>
      {/* Step Content */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            color: brandColors.charcoal,
            mb: 2,
          }}
        >
          Complete your profile
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: brandColors.charcoal,
            opacity: 0.7,
            mb: 4,
            lineHeight: 1.6,
          }}
        >
          Your profile photo helps neighbors recognize you when borrowing or
          sharing items, building trust in our community. A brief &quot;About
          me&quot; section helps others understand your interests and sharing
          style, making it easier to connect with the right neighbors for your
          needs.
        </Typography>

        <Stack spacing={4}>
          {/* Profile Picture Upload */}
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: brandColors.charcoal,
                mb: 2,
              }}
            >
              Profile Picture *
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  {...(currentImageUrl ? { src: currentImageUrl } : {})}
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: brandColors.softGray,
                    color: brandColors.charcoal,
                    fontSize: '2.5rem',
                  }}
                >
                  {currentImageUrl ? null : <CameraAlt />}
                </Avatar>

                {/* Verification Status Overlay */}
                {verificationStatus === 'verifying' && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                )}

                {verificationStatus === 'approved' && (
                  <CheckCircle
                    sx={{
                      position: 'absolute',
                      bottom: 5,
                      right: 5,
                      color: 'success.main',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                    }}
                  />
                )}

                {verificationStatus === 'rejected' && (
                  <Warning
                    sx={{
                      position: 'absolute',
                      bottom: 5,
                      right: 5,
                      color: 'error.main',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                    }}
                  />
                )}

                {currentImageUrl && (
                  <IconButton
                    size="small"
                    onClick={handleRemoveImage}
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      bgcolor: brandColors.charcoal,
                      color: brandColors.white,
                      '&:hover': {
                        bgcolor: brandColors.charcoal,
                      },
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Close sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
              </Box>

              <Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                <Button
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  startIcon={<CameraAlt />}
                  disabled={verificationStatus === 'verifying'}
                  sx={{
                    borderRadius: '8px',
                    textTransform: 'none',
                    borderColor: brandColors.inkBlue,
                    color: brandColors.inkBlue,
                    '&:hover': {
                      borderColor: brandColors.inkBlue,
                      bgcolor: 'rgba(37, 99, 235, 0.04)',
                    },
                  }}
                >
                  {currentImageUrl ? 'Change Photo' : 'Add Photo'}
                </Button>

                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 1,
                    color: brandColors.charcoal,
                    opacity: 0.6,
                  }}
                >
                  JPEG, PNG, WebP up to 10MB
                </Typography>
              </Box>
            </Box>

            {/* Verification Message */}
            {verificationMessage && (
              <Alert
                severity={verificationMessage.type}
                sx={{
                  mt: 2,
                  borderRadius: 2,
                  ...(verificationMessage.type === 'error' && {
                    '& .MuiAlert-message': {
                      fontSize: '0.875rem',
                    },
                  }),
                }}
              >
                {verificationMessage.message}
                {verificationStatus === 'rejected' && (
                  <Box sx={{ mt: 1, fontSize: '0.8rem', opacity: 0.8 }}>
                    <strong>Photo Guidelines:</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                      <li>
                        Must be a clear photo of a real person (no cartoons,
                        animals, or objects)
                      </li>
                      <li>Should show your face clearly</li>
                      <li>
                        No inappropriate content, gestures, or offensive
                        text/symbols
                      </li>
                      <li>Family-friendly and welcoming for our community</li>
                    </ul>
                  </Box>
                )}
              </Alert>
            )}

            {errors.profilePicture && (
              <Typography
                variant="caption"
                sx={{
                  color: 'error.main',
                  mt: 1,
                  display: 'block',
                }}
              >
                {errors.profilePicture.message}
              </Typography>
            )}
          </Box>

          {/* About Me */}
          <Box>
            <TextField
              {...register('bio')}
              label="About me (Optional)"
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: brandColors.white,
                  '&:hover': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: brandColors.inkBlue,
                    },
                  },
                  '&.Mui-focused': {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: brandColors.inkBlue,
                      borderWidth: 2,
                    },
                  },
                },
                '& .MuiInputLabel-root': {
                  '&.Mui-focused': {
                    color: brandColors.inkBlue,
                  },
                },
              }}
            />

            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 1,
                color: brandColors.charcoal,
                opacity: 0.6,
                fontStyle: 'italic',
                lineHeight: 1.4,
              }}
            >
              Example: &quot;I&apos;ve been in the neighborhood for 3 years.
              Live with my spouse, two kids, and three big dogs. Love gardening
              and camping, and have a bunch of sporting goods the kids have
              outgrown. I&apos;m generally not too fussy with stuff, but I admit
              a pet peeve is leaving tools outside overnight!&quot;
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Navigation */}
      <Box sx={{ pt: 2 }}>
        {/* Back link */}
        <Button
          variant="text"
          onClick={onBack}
          startIcon={<ArrowBack />}
          sx={{
            mb: 2,
            px: 0,
            py: 1,
            fontSize: '0.875rem',
            fontWeight: 500,
            textTransform: 'none',
            color: brandColors.charcoal,
            opacity: 0.7,
            '&:hover': {
              opacity: 1,
              backgroundColor: 'transparent',
            },
          }}
        >
          Back
        </Button>

        {/* Full-width primary button */}
        <Button
          variant="contained"
          onClick={onNext}
          endIcon={<ArrowForward />}
          fullWidth
          sx={{
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: '12px',
            textTransform: 'none',
            boxShadow: '0 4px 14px 0 rgba(30, 58, 95, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 20px 0 rgba(30, 58, 95, 0.3)',
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
}
