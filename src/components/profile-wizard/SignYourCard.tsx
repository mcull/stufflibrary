'use client';

import {
  Box,
  Checkbox,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';

import { TERMS_VERSION } from '@/lib/capabilities';
import { brandColors } from '@/theme/brandTokens';

import type { ProfileFormData } from '../ProfileWizard';

const GUIDELINES = [
  'Household goods only — nothing illegal, unsafe, or age-restricted (alcohol, tobacco, firearms, anything requiring ID).',
  'Take care of what you borrow; return it as you found it.',
  "Be kind — we're neighbors first.",
];

export function SignYourCard() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProfileFormData>();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* The card: name entered here is the signature. */}
      <Box
        sx={{
          border: `1.5px solid ${brandColors.inkBlue}`,
          borderRadius: 2,
          p: 3,
          backgroundColor: brandColors.white,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            letterSpacing: 2,
            color: brandColors.charcoal,
            opacity: 0.7,
            mb: 1.5,
          }}
        >
          LIBRARY CARD · SIGN TO ACTIVATE
        </Typography>
        <TextField
          {...register('name')}
          label="Your name"
          placeholder="Sign your name"
          error={!!errors.name}
          helperText={errors.name?.message}
          fullWidth
          variant="standard"
          sx={{
            '& .MuiInput-input': {
              fontFamily: "'Segoe Script', 'Snell Roundhand', cursive",
              fontSize: '1.4rem',
              color: brandColors.inkBlue,
            },
          }}
        />
      </Box>

      {/* The house rules, as readable text (not checkboxes). */}
      <Box>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 600, color: brandColors.charcoal, mb: 1 }}
        >
          The house rules
        </Typography>
        <Stack component="ul" sx={{ pl: 2.5, m: 0, gap: 0.5 }}>
          {GUIDELINES.map((g) => (
            <Typography
              key={g}
              component="li"
              variant="body2"
              sx={{ color: brandColors.charcoal }}
            >
              {g}
            </Typography>
          ))}
        </Stack>
      </Box>

      {/* One promise. */}
      <Controller
        name="agreedToTerms"
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
              <Box>
                <Typography
                  variant="body2"
                  sx={{ color: brandColors.charcoal }}
                >
                  I&rsquo;ll take care of the stuff I borrow, and won&rsquo;t
                  lend anything irreplaceable.
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: brandColors.charcoal, opacity: 0.7 }}
                >
                  Covers the house rules &amp; our{' '}
                  <Link href="/terms" target="_blank" rel="noopener">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" rel="noopener">
                    Privacy Policy
                  </Link>{' '}
                  (v{TERMS_VERSION}).
                </Typography>
              </Box>
            }
          />
        )}
      />
    </Box>
  );
}
