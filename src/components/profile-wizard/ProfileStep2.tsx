'use client';

import { ArrowBack, ArrowForward, CameraAlt, Close } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { useRef, useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';

import { brandColors } from '@/theme/brandTokens';

import type { ProfileFormData } from '../ProfileWizard';

const interestOptions = [
  'Tools & Hardware',
  'Kitchen & Cooking',
  'Outdoor & Sports',
  'Arts & Crafts',
  'Books & Media',
  'Technology',
  'Gardening',
  'Baby & Kids',
  'Musical Instruments',
  'Home & Decor',
  'Automotive',
  'Exercise & Fitness',
];

interface ProfileStep2Props {
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function ProfileStep2({ onNext, onBack }: ProfileStep2Props) {
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<ProfileFormData>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const _profilePicture = watch('profilePicture');
  const profilePictureUrl = watch('profilePictureUrl');
  const selectedInterests = watch('interests') || [];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image must be less than 2MB');
      return;
    }

    setUploadError(null);
    setValue('profilePicture', file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Cleanup old preview URL
    return () => {
      URL.revokeObjectURL(url);
    };
  };

  const handleRemoveImage = () => {
    setValue('profilePicture', undefined);
    setValue('profilePictureUrl', undefined);
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInterestToggle = (interest: string) => {
    const newInterests = selectedInterests.includes(interest)
      ? selectedInterests.filter((i) => i !== interest)
      : [...selectedInterests, interest];

    setValue('interests', newInterests, { shouldValidate: true });
  };

  const currentImageUrl = previewUrl || profilePictureUrl;

  return (
    <Box sx={{ minHeight: '500px' }}>
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
          }}
        >
          Add a photo and tell us what interests you most.
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
              Profile Picture (Optional)
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  {...(currentImageUrl ? { src: currentImageUrl } : {})}
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: brandColors.softGray,
                    color: brandColors.charcoal,
                    fontSize: '2rem',
                  }}
                >
                  {currentImageUrl ? null : <CameraAlt />}
                </Avatar>

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
                      width: 24,
                      height: 24,
                    }}
                  >
                    <Close sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Box>

              <Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />

                <Button
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  startIcon={<CameraAlt />}
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
                  {currentImageUrl ? 'Change Photo' : 'Upload Photo'}
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
                  JPG, PNG up to 2MB
                </Typography>
              </Box>
            </Box>

            {uploadError && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                {uploadError}
              </Alert>
            )}
          </Box>

          {/* Bio */}
          <TextField
            {...register('bio')}
            label="Bio (Optional)"
            placeholder="Tell us a bit about yourself..."
            multiline
            rows={3}
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

          {/* Interests */}
          <Controller
            name="interests"
            control={control}
            render={() => (
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    color: brandColors.charcoal,
                    mb: 2,
                  }}
                >
                  What interests you? *
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {interestOptions.map((interest) => (
                    <Chip
                      key={interest}
                      label={interest}
                      onClick={() => handleInterestToggle(interest)}
                      color={
                        selectedInterests.includes(interest)
                          ? 'primary'
                          : 'default'
                      }
                      variant={
                        selectedInterests.includes(interest)
                          ? 'filled'
                          : 'outlined'
                      }
                      sx={{
                        borderRadius: '20px',
                        '&.MuiChip-colorPrimary': {
                          backgroundColor: brandColors.inkBlue,
                          '&:hover': {
                            backgroundColor: brandColors.inkBlue,
                          },
                        },
                        '&.MuiChip-outlined': {
                          borderColor: brandColors.softGray,
                          '&:hover': {
                            borderColor: brandColors.inkBlue,
                            backgroundColor: 'rgba(37, 99, 235, 0.04)',
                          },
                        },
                      }}
                    />
                  ))}
                </Box>

                {errors.interests && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'error.main',
                      mt: 1,
                      display: 'block',
                    }}
                  >
                    {errors.interests.message}
                  </Typography>
                )}
              </Box>
            )}
          />
        </Stack>
      </Box>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          startIcon={<ArrowBack />}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: '12px',
            textTransform: 'none',
            borderColor: brandColors.softGray,
            color: brandColors.charcoal,
            '&:hover': {
              borderColor: brandColors.charcoal,
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          Back
        </Button>

        <Button
          variant="contained"
          onClick={onNext}
          endIcon={<ArrowForward />}
          sx={{
            px: 4,
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
