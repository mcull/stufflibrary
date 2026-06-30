'use client';

import { ArrowBack, CameraAlt, CheckCircle } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material';
import { useFormContext, Controller } from 'react-hook-form';

import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { brandColors } from '@/theme/brandTokens';

import type { ProfileFormData } from '../ProfileWizard';

interface ProfileStep3Props {
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  profilePicturePreviewUrl?: string | null;
  onMinimalSubmit?: () => void;
  isSubmittingMinimal?: boolean;
}

export function ProfileStep3({
  onBack,
  profilePicturePreviewUrl,
}: ProfileStep3Props) {
  const {
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useFormContext<ProfileFormData>();

  const formData = watch();
  const { name, bio, profilePicture, profilePictureUrl, parsedAddress } =
    formData;

  const currentImageUrl = profilePicturePreviewUrl || profilePictureUrl;

  // Address must be verified (parsed) and a photo must have been added.
  const hasVerifiedAddress = Boolean(
    parsedAddress?.address1 &&
      parsedAddress?.city &&
      parsedAddress?.state &&
      parsedAddress?.zip
  );
  const canProceed = hasVerifiedAddress && Boolean(profilePicture);

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
          Verify your address so we can connect you with nearby neighbors, then
          finish up.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Profile Summary */}
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
            }}
          >
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
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', mb: 1 }}
                    >
                      {parsedAddress.city}, {parsedAddress.state}
                    </Typography>
                  )}
                  {bio && (
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary' }}
                    >
                      {bio}
                    </Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Address */}
          <Stack spacing={1}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, color: brandColors.charcoal }}
            >
              Your address
            </Typography>
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <AddressAutocomplete
                  value={field.value}
                  onChange={(value, addr) => {
                    field.onChange(value);
                    if (addr) {
                      setValue('parsedAddress', addr);
                    }
                  }}
                  error={!!errors.address}
                  helperText={errors.address?.message || undefined}
                  placeholder="123 Main Street, City, State"
                />
              )}
            />
          </Stack>
        </Box>
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
          type="submit"
          variant="contained"
          disabled={!canProceed || isSubmitting}
          endIcon={
            isSubmitting ? <CircularProgress size={16} /> : <CheckCircle />
          }
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
