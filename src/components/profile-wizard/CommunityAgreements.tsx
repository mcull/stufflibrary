'use client';

import {
  Box,
  Checkbox,
  FormControlLabel,
  Typography,
  Link,
} from '@mui/material';
import { useFormContext, Controller } from 'react-hook-form';

import { brandColors } from '@/theme/brandTokens';

import type { ProfileFormData } from '../ProfileWizard';

const AGREEMENTS: {
  name:
    | 'agreedToHouseholdGoods'
    | 'agreedToTrustAndCare'
    | 'agreedToCommunityValues'
    | 'agreedToAgeRestrictions';
  label: React.ReactNode;
}[] = [
  {
    name: 'agreedToHouseholdGoods',
    label:
      'I understand that Stuff Library is for sharing normal household goods only. Sharing anything illegal, unsafe, or inappropriate will result in account closure.',
  },
  {
    name: 'agreedToTrustAndCare',
    label:
      "I'll do my best to take care of borrowed items, and I won't share anything irreplaceable or where normal wear and tear would upset me.",
  },
  {
    name: 'agreedToCommunityValues',
    label:
      "I'm here to build community through sharing. I'll treat neighbors with kindness and respect—hurtful behavior won't be tolerated.",
  },
  {
    name: 'agreedToAgeRestrictions',
    label:
      "I understand that Stuff Library doesn't verify ages, so I won't share age-restricted items like alcohol, tobacco, firearms, or anything requiring ID.",
  },
];

/**
 * The five community agreements (4 guidelines + terms). Shared so the minimal
 * entry step and any continuation can render the same interdependent checkboxes.
 */
export function CommunityAgreements() {
  const {
    watch,
    control,
    formState: { errors },
  } = useFormContext<ProfileFormData>();

  const agreedToHouseholdGoods = watch('agreedToHouseholdGoods');
  const agreedToTrustAndCare = watch('agreedToTrustAndCare');
  const agreedToCommunityValues = watch('agreedToCommunityValues');
  const agreedToAgeRestrictions = watch('agreedToAgeRestrictions');

  const guidelinesAccepted =
    agreedToHouseholdGoods &&
    agreedToTrustAndCare &&
    agreedToCommunityValues &&
    agreedToAgeRestrictions;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 600, color: brandColors.charcoal, mb: 1 }}
      >
        Community Guidelines
      </Typography>

      {AGREEMENTS.map((agreement) => (
        <Controller
          key={agreement.name}
          name={agreement.name}
          control={control}
          render={({ field: { onChange, value } }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={value || false}
                  onChange={(e) => onChange(e.target.checked)}
                  sx={{
                    color: brandColors.inkBlue,
                    '&.Mui-checked': { color: brandColors.inkBlue },
                  }}
                />
              }
              label={
                <Typography
                  variant="body2"
                  sx={{ color: brandColors.charcoal }}
                >
                  {agreement.label}
                </Typography>
              }
            />
          )}
        />
      ))}

      {/* Terms Agreement — only enabled once the guidelines are accepted */}
      <Controller
        name="agreedToTerms"
        control={control}
        render={({ field: { onChange, value } }) => (
          <FormControlLabel
            control={
              <Checkbox
                checked={value || false}
                onChange={(e) => onChange(e.target.checked)}
                disabled={!guidelinesAccepted}
                sx={{
                  color: brandColors.inkBlue,
                  '&.Mui-checked': { color: brandColors.inkBlue },
                  '&.Mui-disabled': { color: brandColors.softGray },
                }}
              />
            }
            label={
              <Typography
                variant="body2"
                sx={{
                  color: guidelinesAccepted
                    ? brandColors.charcoal
                    : brandColors.softGray,
                }}
              >
                I agree to the{' '}
                <Link
                  href="/terms"
                  target="_blank"
                  sx={{
                    color: guidelinesAccepted
                      ? brandColors.inkBlue
                      : brandColors.softGray,
                  }}
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  target="_blank"
                  sx={{
                    color: guidelinesAccepted
                      ? brandColors.inkBlue
                      : brandColors.softGray,
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
      {(
        [
          'agreedToHouseholdGoods',
          'agreedToTrustAndCare',
          'agreedToCommunityValues',
          'agreedToAgeRestrictions',
          'agreedToTerms',
        ] as const
      ).map((field) =>
        errors[field] ? (
          <Typography
            key={field}
            variant="caption"
            sx={{ color: 'error.main', display: 'block' }}
          >
            {errors[field]?.message}
          </Typography>
        ) : null
      )}
    </Box>
  );
}
