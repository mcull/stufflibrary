'use client';

import { ArrowForward, Person } from '@mui/icons-material';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useFormContext, Controller } from 'react-hook-form';

import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { brandColors } from '@/theme/brandTokens';

import type { ProfileFormData } from '../ProfileWizard';

interface ProfileStep1Props {
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  profilePicturePreviewUrl?: string | null;
}

export function ProfileStep1({ onNext }: ProfileStep1Props) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<ProfileFormData>();

  return (
    <Box sx={{ minHeight: '400px' }}>
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
          Let&apos;s start with the basics
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: brandColors.charcoal,
            opacity: 0.7,
            mb: 4,
          }}
        >
          Tell us a bit about yourself so other members can get to know you. We
          need your address to help you find neighbors in your area.
        </Typography>

        <Stack spacing={3}>
          <TextField
            {...register('name')}
            label="Full Name"
            placeholder="Enter your full name"
            error={!!errors.name}
            helperText={errors.name?.message}
            fullWidth
            variant="outlined"
            InputProps={{
              startAdornment: (
                <Person
                  sx={{ color: brandColors.charcoal, mr: 1, opacity: 0.6 }}
                />
              ),
            }}
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

          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <AddressAutocomplete
                value={field.value}
                onChange={(value, parsedAddress) => {
                  field.onChange(value);
                  // Store parsed address data in form for submission
                  if (parsedAddress) {
                    setValue('parsedAddress', parsedAddress);
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

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
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
