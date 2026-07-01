'use client';

import {
  CheckCircle,
  RadioButtonUnchecked,
  RadioButtonChecked,
} from '@mui/icons-material';
import { Box, Typography } from '@mui/material';

import { brandColors } from '@/theme/brandTokens';

import type { CompletenessItem, CompletenessKey } from './completeness';

interface ProfileCompletenessProps {
  items: CompletenessItem[];
  /** The part the user is currently filling in (for a gentle you-are-here). */
  currentKey?: CompletenessKey;
}

/**
 * Replaces the linear 1-2-3 stepper. Shows the parts of the library card and
 * checks each off as it's added — so photo/address read as "fill in anytime,"
 * not "mandatory next step."
 */
export function ProfileCompleteness({
  items,
  currentKey,
}: ProfileCompletenessProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: { xs: 3, sm: 6 },
        flexWrap: 'wrap',
      }}
    >
      {items.map((item) => {
        const isCurrent = item.key === currentKey && !item.done;
        const active = item.done || isCurrent;
        const color = active ? brandColors.inkBlue : brandColors.softGray;

        return (
          <Box
            key={item.key}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.75,
              minWidth: 72,
            }}
          >
            {item.done ? (
              <CheckCircle sx={{ color }} />
            ) : isCurrent ? (
              <RadioButtonChecked sx={{ color }} />
            ) : (
              <RadioButtonUnchecked sx={{ color }} />
            )}
            <Typography
              variant="caption"
              sx={{
                color: active ? brandColors.charcoal : brandColors.softGray,
                fontWeight: isCurrent ? 700 : 500,
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {item.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
