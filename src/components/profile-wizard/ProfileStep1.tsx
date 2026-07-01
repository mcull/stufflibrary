'use client';

import { ArrowForward, Person } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useFormContext } from 'react-hook-form';

import { brandColors } from '@/theme/brandTokens';

import type { ProfileFormData } from '../ProfileWizard';

import { CommunityAgreements } from './CommunityAgreements';
import { canSubmitMinimal } from './minimalEntry';

interface ProfileStep1Props {
  onNext: () => void;
  onBack: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  profilePicturePreviewUrl?: string | null;
  onMinimalSubmit?: () => void;
  isSubmittingMinimal?: boolean;
  onCancel?: () => void;
}

export function ProfileStep1({
  onNext,
  onMinimalSubmit,
  isSubmittingMinimal,
}: ProfileStep1Props) {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<ProfileFormData>();

  const values = watch();
  const canStart = canSubmitMinimal({
    name: values.name ?? '',
    agreedToHouseholdGoods: !!values.agreedToHouseholdGoods,
    agreedToTrustAndCare: !!values.agreedToTrustAndCare,
    agreedToCommunityValues: !!values.agreedToCommunityValues,
    agreedToAgeRestrictions: !!values.agreedToAgeRestrictions,
    agreedToTerms: !!values.agreedToTerms,
  });

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
          Tell us your name and agree to a few community basics. You can add a
          photo and your address in a minute.
        </Typography>

        <Stack spacing={4}>
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

          <CommunityAgreements />
        </Stack>
      </Box>

      {/* Navigation */}
      <Box sx={{ pt: 2 }}>
        {/* Primary: minimal entry */}
        <Button
          variant="contained"
          onClick={onMinimalSubmit}
          disabled={!canStart || !!isSubmittingMinimal}
          endIcon={
            isSubmittingMinimal ? (
              <CircularProgress size={16} />
            ) : (
              <ArrowForward />
            )
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
          {isSubmittingMinimal ? 'Getting started…' : 'Get started'}
        </Button>

        {/* Secondary: continue to the full profile now */}
        <Button
          variant="text"
          onClick={onNext}
          disabled={!canStart || !!isSubmittingMinimal}
          fullWidth
          sx={{
            mt: 1.5,
            py: 1,
            fontSize: '0.875rem',
            fontWeight: 500,
            textTransform: 'none',
            color: brandColors.charcoal,
            opacity: 0.8,
            '&:hover': { opacity: 1, backgroundColor: 'transparent' },
          }}
        >
          Add a photo &amp; address now
        </Button>
      </Box>
    </Box>
  );
}
