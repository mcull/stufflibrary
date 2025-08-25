'use client';

import { ArrowBack, CameraAlt, CheckCircle } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Typography,
  CircularProgress,
  Chip,
  Link,
} from '@mui/material';
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';

import { brandColors } from '@/theme/brandTokens';

import type { ProfileFormData } from '../ProfileWizard';

interface ProfileStep3Props {
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  profilePicturePreviewUrl?: string | null;
}


export function ProfileStep3({ onBack, profilePicturePreviewUrl }: ProfileStep3Props) {
  const {
    register,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useFormContext<ProfileFormData>();


  const formData = watch();
  const { 
    name, 
    bio, 
    shareInterests, 
    borrowInterests, 
    profilePicture, 
    profilePictureUrl,
    agreedToHouseholdGoods,
    agreedToTrustAndCare,
    agreedToCommunityValues,
    agreedToAgeRestrictions,
    agreedToTerms,
    parsedAddress 
  } = formData;

  const currentImageUrl = profilePicturePreviewUrl || profilePictureUrl;
  const canProceed = agreedToTerms && agreedToHouseholdGoods && agreedToTrustAndCare && agreedToCommunityValues && agreedToAgeRestrictions && profilePicture;

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
          Review your profile information and agree to our terms to complete your registration.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

          {/* Profile Summary */}
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, color: brandColors.charcoal, mb: 2 }}
              >
                Profile Summary
              </Typography>

              <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                <Avatar
                  {...(currentImageUrl ? { src: currentImageUrl } : {})}
                  sx={{ width: 60, height: 60 }}
                >
                  {!currentImageUrl && <CameraAlt />}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {name || 'Your Name'}
                  </Typography>
                  {parsedAddress && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      {parsedAddress.city}, {parsedAddress.state}
                    </Typography>
                  )}
                  {bio && (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {bio}
                    </Typography>
                  )}
                </Box>
              </Box>

              {shareInterests?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Willing to share:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {shareInterests.slice(0, 3).map((interest) => (
                      <Chip
                        key={interest}
                        label={interest}
                        size="small"
                        color="primary"
                        variant="filled"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                    {shareInterests.length > 3 && (
                      <Chip
                        label={`+${shareInterests.length - 3} more`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>
                </Box>
              )}

              {borrowInterests?.length > 0 && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Looking to borrow:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {borrowInterests.slice(0, 3).map((interest) => (
                      <Chip
                        key={interest}
                        label={interest}
                        size="small"
                        color="secondary"
                        variant="filled"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                    {borrowInterests.length > 3 && (
                      <Chip
                        label={`+${borrowInterests.length - 3} more`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Community Guidelines */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: brandColors.charcoal, mb: 1 }}>
              Community Guidelines
            </Typography>
            
            <Controller
              name="agreedToHouseholdGoods"
              control={control}
              render={({ field: { onChange, value } }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={value || false}
                      onChange={(e) => onChange(e.target.checked)}
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
                      I understand that Stuff Library is for sharing normal household goods only. 
                      Sharing anything illegal, unsafe, or inappropriate will result in account closure.
                    </Typography>
                  }
                />
              )}
            />

            <Controller
              name="agreedToTrustAndCare"
              control={control}
              render={({ field: { onChange, value } }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={value || false}
                      onChange={(e) => onChange(e.target.checked)}
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
                      I'll do my best to take care of borrowed items, and I won't share anything 
                      irreplaceable or where normal wear and tear would upset me.
                    </Typography>
                  }
                />
              )}
            />

            <Controller
              name="agreedToCommunityValues"
              control={control}
              render={({ field: { onChange, value } }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={value || false}
                      onChange={(e) => onChange(e.target.checked)}
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
                      I'm here to build community through sharing. I'll treat neighbors with 
                      kindness and respect—hurtful behavior won't be tolerated.
                    </Typography>
                  }
                />
              )}
            />

            <Controller
              name="agreedToAgeRestrictions"
              control={control}
              render={({ field: { onChange, value } }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={value || false}
                      onChange={(e) => onChange(e.target.checked)}
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
                      I understand that Stuff Library doesn't verify ages, so I won't share 
                      age-restricted items like alcohol, tobacco, firearms, or anything requiring ID.
                    </Typography>
                  }
                />
              )}
            />
          </Box>

          {/* Terms Agreement */}
          <Controller
            name="agreedToTerms"
            control={control}
            render={({ field: { onChange, value } }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={value || false}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={!agreedToHouseholdGoods || !agreedToTrustAndCare || !agreedToCommunityValues || !agreedToAgeRestrictions}
                    sx={{
                      color: brandColors.inkBlue,
                      '&.Mui-checked': {
                        color: brandColors.inkBlue,
                      },
                      '&.Mui-disabled': {
                        color: brandColors.softGray,
                      },
                    }}
                  />
                }
                label={
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: (!agreedToHouseholdGoods || !agreedToTrustAndCare || !agreedToCommunityValues || !agreedToAgeRestrictions) 
                        ? brandColors.softGray 
                        : brandColors.charcoal 
                    }}
                  >
                    I agree to the{' '}
                    <Link 
                      href="/terms" 
                      target="_blank" 
                      sx={{ 
                        color: (!agreedToHouseholdGoods || !agreedToTrustAndCare || !agreedToCommunityValues || !agreedToAgeRestrictions) 
                          ? brandColors.softGray 
                          : brandColors.inkBlue 
                      }}
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link 
                      href="/privacy" 
                      target="_blank" 
                      sx={{ 
                        color: (!agreedToHouseholdGoods || !agreedToTrustAndCare || !agreedToCommunityValues || !agreedToAgeRestrictions) 
                          ? brandColors.softGray 
                          : brandColors.inkBlue 
                      }}
                    >
                      Privacy Policy
                    </Link>
                  </Typography>
                }
              />
            )}
          />

          {/* Error Messages */}
          {errors.agreedToHouseholdGoods && (
            <Typography
              variant="caption"
              sx={{
                color: 'error.main',
                display: 'block',
              }}
            >
              {errors.agreedToHouseholdGoods.message}
            </Typography>
          )}

          {errors.agreedToTrustAndCare && (
            <Typography
              variant="caption"
              sx={{
                color: 'error.main',
                display: 'block',
              }}
            >
              {errors.agreedToTrustAndCare.message}
            </Typography>
          )}

          {errors.agreedToCommunityValues && (
            <Typography
              variant="caption"
              sx={{
                color: 'error.main',
                display: 'block',
              }}
            >
              {errors.agreedToCommunityValues.message}
            </Typography>
          )}

          {errors.agreedToAgeRestrictions && (
            <Typography
              variant="caption"
              sx={{
                color: 'error.main',
                display: 'block',
              }}
            >
              {errors.agreedToAgeRestrictions.message}
            </Typography>
          )}

          {errors.agreedToTerms && (
            <Typography
              variant="caption"
              sx={{
                color: 'error.main',
                display: 'block',
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
          disabled={!canProceed || isSubmitting}
          endIcon={isSubmitting ? <CircularProgress size={16} /> : <CheckCircle />}
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
              backgroundColor: brandColors.softGray,
              color: brandColors.charcoal,
              opacity: 0.6,
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