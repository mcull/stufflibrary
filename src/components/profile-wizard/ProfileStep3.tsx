'use client';

import { CheckCircle } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
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
  onCancel?: () => void;
}

export function ProfileStep3({ onCancel }: ProfileStep3Props) {
  const {
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useFormContext<ProfileFormData>();

  const parsedAddress = watch('parsedAddress');
  const hasVerifiedAddress = Boolean(
    parsedAddress?.address1 &&
      parsedAddress?.city &&
      parsedAddress?.state &&
      parsedAddress?.zip
  );

  return (
    <Box sx={{ minHeight: '400px' }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 600, color: brandColors.charcoal, mb: 2 }}
        >
          Where do you and your stuff live?
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: brandColors.charcoal, opacity: 0.7, mb: 4 }}
        >
          Sharing works best close to home. Your address puts you on the
          neighborhood map so members can see how near everything is —
          it&rsquo;s only shown to people in your libraries.
        </Typography>

        <Stack spacing={1}>
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

      {/* Navigation: Cancel / Done */}
      <Box
        sx={{
          pt: 2,
          display: 'flex',
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          gap: 2,
        }}
      >
        <Button
          variant="text"
          onClick={onCancel}
          sx={{
            py: 1.5,
            px: 3,
            fontSize: '1rem',
            fontWeight: 500,
            textTransform: 'none',
            color: brandColors.charcoal,
            opacity: 0.8,
            '&:hover': { opacity: 1, backgroundColor: 'rgba(0,0,0,0.04)' },
          }}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          variant="contained"
          disabled={!hasVerifiedAddress || isSubmitting}
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
          {isSubmitting ? 'Saving…' : 'Done!'}
        </Button>
      </Box>
    </Box>
  );
}
