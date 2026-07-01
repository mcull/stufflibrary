'use client';

import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';

import { brandColors } from '@/theme/brandTokens';

import type { CompletenessItem, CompletenessKey } from './completeness';

interface ProfileCompletenessProps {
  items: CompletenessItem[];
  /** The parts being filled in on the current screen (gentle you-are-here). */
  currentKeys?: CompletenessKey[];
}

/**
 * Replaces the linear 1-2-3 stepper. Shows the parts of the library card and
 * checks each off as it's added — so photo/address read as "fill in anytime,"
 * not "mandatory next step."
 */
export function ProfileCompleteness({
  items,
  currentKeys,
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
        const isCurrent =
          !item.done && (currentKeys?.includes(item.key) ?? false);
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
            {/* Done = check; still-to-do = a hollow ring (highlighted in brand
                color when it's the part being filled in). No filled radios,
                which read like a selectable form control. */}
            {item.done ? (
              <CheckCircle sx={{ color }} />
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
