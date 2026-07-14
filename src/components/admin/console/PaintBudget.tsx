'use client';

import { Box } from '@mui/material';

import { paintBudgetView } from '@/lib/admin/desk';
import { brandColors } from '@/theme/brandTokens';

import { ConsoleCard } from './cards';
import { console_, consoleType } from './tokens';

interface PaintBudgetProps {
  monthCents: number;
  capCents: number;
  renders: number;
}

/**
 * Month-to-date watercolor spend. Deliberately no progress bar: the only
 * cap that exists is a DAILY spend cap, and a bar comparing month spend to
 * a day's cap would lie (the design's bar assumed a monthly cap).
 */
export function PaintBudget({
  monthCents,
  capCents,
  renders,
}: PaintBudgetProps) {
  const view = paintBudgetView({ monthCents, capCents, renders });

  return (
    <ConsoleCard title="PAINT BUDGET">
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <Box
          component="span"
          sx={{
            fontFamily: 'Merriweather, Georgia, serif',
            fontWeight: 900,
            fontSize: '26px',
            color: brandColors.inkBlue,
          }}
        >
          {view.monthLabel}
        </Box>
        <Box
          component="span"
          sx={{ ...consoleType.deltaLine, color: console_.textMuted }}
        >
          this month
        </Box>
      </Box>
      <Box
        sx={{
          ...consoleType.deltaLine,
          color: console_.textMuted,
          marginTop: '6px',
        }}
      >
        {view.rendersLabel} · ~{view.perRenderLabel} per render
      </Box>
      <Box
        sx={{
          ...consoleType.deltaLine,
          color: console_.textMuted,
          marginTop: '2px',
        }}
      >
        {view.capLabel}/day spend cap
      </Box>
    </ConsoleCard>
  );
}
