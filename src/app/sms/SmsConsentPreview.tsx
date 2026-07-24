'use client';

import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material';

import {
  SMS_CONSENT_DISCLOSURE,
  SMS_CONSENT_HEADLINE,
} from '@/lib/sms-consent';

/**
 * A read-only reproduction of the opt-in checkbox as it appears in profile
 * settings. It renders from the same constants as the real form
 * (`ProfileView`), so this page cannot drift from the consent a member
 * actually gives.
 */
export function SmsConsentPreview() {
  return (
    <FormControlLabel
      sx={{ alignItems: 'flex-start', m: 0, cursor: 'default' }}
      control={
        <Checkbox
          checked={false}
          readOnly
          disableRipple
          inputProps={{ 'aria-readonly': true }}
          sx={{ mt: -1, cursor: 'default' }}
        />
      }
      label={
        <Box>
          <Typography variant="body2">{SMS_CONSENT_HEADLINE}</Typography>
          <Typography variant="caption" color="text.secondary">
            {SMS_CONSENT_DISCLOSURE}
          </Typography>
        </Box>
      }
    />
  );
}
