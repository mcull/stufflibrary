'use client';

import { ArrowBack, CheckCircle, Person, Interests } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Typography,
  Chip,
  Link,
  CircularProgress,
} from '@mui/material';
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { brandColors } from '@/theme/brandTokens';

import type { ProfileFormData } from '../ProfileWizard';

interface ProfileStep3Props {
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function ProfileStep3({ onBack }: ProfileStep3Props) {
  const {
    register,
    watch,
    formState: { errors, isSubmitting },
  } = useFormContext<ProfileFormData>();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const formData = watch();
  const {
    name,
    bio,
    interests,
    profilePicture,
    profilePictureUrl,
    agreedToTerms,
  } = formData;

  // Create preview URL for uploaded file
  React.useEffect(() => {
    if (profilePicture) {
      const url = URL.createObjectURL(profilePicture);
      setPreviewUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
    return undefined;
  }, [profilePicture]);

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
          Review and complete
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: brandColors.charcoal,
            opacity: 0.7,
            mb: 4,
          }}
        >
          Take a moment to review your profile before submitting.
        </Typography>

        {/* Profile Preview Card */}
        <Card
          elevation={0}
          sx={{
            border: `1px solid ${brandColors.softGray}`,
            borderRadius: '12px',
            mb: 4,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
              <Avatar
                {...(currentImageUrl ? { src: currentImageUrl } : {})}
                sx={{
                  width: 60,
                  height: 60,
                  bgcolor: brandColors.softGray,
                  color: brandColors.charcoal,
                }}
              >
                {currentImageUrl ? null : <Person />}
              </Avatar>

              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: brandColors.charcoal,
                    mb: 1,
                  }}
                >
                  {name || 'Your Name'}
                </Typography>

                {bio && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: brandColors.charcoal,
                      opacity: 0.8,
                      mt: 1,
                    }}
                  >
                    {bio}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Interests */}
            {interests && interests.length > 0 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Interests
                    sx={{
                      fontSize: 16,
                      color: brandColors.charcoal,
                      opacity: 0.6,
                      mr: 0.5,
                    }}
                  />
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: brandColors.charcoal,
                    }}
                  >
                    Interests
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {interests.map((interest) => (
                    <Chip
                      key={interest}
                      label={interest}
                      size="small"
                      sx={{
                        backgroundColor: brandColors.inkBlue,
                        color: brandColors.white,
                        borderRadius: '16px',
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Terms Agreement */}
        <Box
          sx={{
            p: 3,
            border: `1px solid ${brandColors.softGray}`,
            borderRadius: '12px',
            backgroundColor: 'rgba(37, 99, 235, 0.02)',
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                {...register('agreedToTerms')}
                checked={agreedToTerms || false}
                sx={{
                  color: brandColors.inkBlue,
                  '&.Mui-checked': {
                    color: brandColors.inkBlue,
                  },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ color: brandColors.charcoal }}>
                I agree to the{' '}
                <Link
                  href="/terms"
                  target="_blank"
                  sx={{ color: brandColors.inkBlue }}
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  sx={{ color: brandColors.inkBlue }}
                >
                  Privacy Policy
                </Link>
                , and I understand that my profile will be visible to other
                StuffLibrary members.
              </Typography>
            }
          />

          {errors.agreedToTerms && (
            <Typography
              variant="caption"
              sx={{
                color: 'error.main',
                mt: 1,
                display: 'block',
                ml: 4,
              }}
            >
              {errors.agreedToTerms.message}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          startIcon={<ArrowBack />}
          disabled={isSubmitting}
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
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <CheckCircle />
            )
          }
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
            '&:disabled': {
              transform: 'none',
              boxShadow: '0 4px 14px 0 rgba(30, 58, 95, 0.1)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {isSubmitting ? 'Creating Profile...' : 'Complete Profile'}
        </Button>
      </Box>
    </Box>
  );
}
