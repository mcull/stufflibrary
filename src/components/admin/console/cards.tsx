'use client';

import { Box } from '@mui/material';
import type { ReactNode } from 'react';

import { VintageStamp } from '@/components/member-home/VintageStamp';
import type { StampTone } from '@/lib/admin/desk';
import { brandColors } from '@/theme/brandTokens';

import { console_, consoleType } from './tokens';

// Shared surfaces for the Circulation Desk (design README "Structure"):
// white cards, 1px cardBorder, radius 8; headers are mono overlines over
// a 2px ink rule.

const cardSurface = {
  backgroundColor: brandColors.white,
  border: `1px solid ${console_.cardBorder}`,
  borderRadius: '8px',
  padding: '16px 18px',
} as const;

export function ConsoleCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box sx={cardSurface}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `2px solid ${brandColors.inkBlue}`,
          paddingBottom: '8px',
          marginBottom: '14px',
        }}
      >
        <Box
          component="span"
          sx={{ ...consoleType.overline, color: brandColors.inkBlue }}
        >
          {title}
        </Box>
        {action}
      </Box>
      {children}
    </Box>
  );
}

const DELTA_INK: Record<'green' | 'red' | 'mustard' | 'muted', string> = {
  green: console_.okGreen,
  red: console_.stampRed,
  mustard: console_.darkMustardText,
  muted: console_.textMuted,
};

export function KpiCard({
  label,
  value,
  delta,
  deltaTone = 'muted',
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: keyof typeof DELTA_INK;
}) {
  return (
    <Box sx={cardSurface}>
      <Box
        component="span"
        sx={{
          ...consoleType.overline,
          color: console_.textMuted,
          display: 'block',
        }}
      >
        {label}
      </Box>
      <Box sx={{ ...consoleType.kpiNumeral, color: brandColors.inkBlue }}>
        {value}
      </Box>
      {delta && (
        <Box sx={{ ...consoleType.deltaLine, color: DELTA_INK[deltaTone] }}>
          {delta}
        </Box>
      )}
    </Box>
  );
}

/**
 * The honest failure line. Each data source that fails renders this in its
 * own region — never fake or partial numbers.
 */
export function DeskErrorLine() {
  return (
    <Box
      component="p"
      sx={{
        ...consoleType.deltaLine,
        fontSize: '11px',
        color: console_.stampRed,
        margin: 0,
        padding: '8px 0',
      }}
    >
      COULD NOT REACH THE DESK — refresh to retry
    </Box>
  );
}

export const STAMP_INK: Record<StampTone, string> = {
  ink: brandColors.inkBlue,
  red: console_.stampRed,
  mustard: console_.darkMustardText,
  green: console_.okGreen,
};

export function StampChip({
  label,
  tone,
  rotation = -2,
}: {
  label: string;
  tone: StampTone;
  rotation?: number;
}) {
  return (
    <VintageStamp
      label={label}
      ink={STAMP_INK[tone]}
      rotation={rotation}
      fontSize={10}
      borderWidth={1.5}
    />
  );
}
