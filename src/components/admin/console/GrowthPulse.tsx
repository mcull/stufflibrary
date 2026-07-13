'use client';

import { Box } from '@mui/material';

import { sparklineEndpoint, sparklinePath } from '@/lib/admin/desk';
import { brandColors } from '@/theme/brandTokens';

import { ConsoleCard } from './cards';
import { console_ } from './tokens';

const SPARK_W = 560;
const SPARK_H = 120;

interface GrowthPulseProps {
  daily: number[];
  signupsToday: number;
  invitesPending: number;
  newLibraries7d: number;
  invitesAccepted30d: number;
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        sx={{
          fontFamily: 'Merriweather, Georgia, serif',
          fontWeight: 700,
          fontSize: '20px',
          color: brandColors.inkBlue,
        }}
      >
        {value.toLocaleString('en-US')}
      </Box>
      <Box
        component="span"
        sx={{
          fontFamily: '"Roboto Mono", monospace',
          fontSize: '10px',
          color: console_.textMuted,
        }}
      >
        {label}
      </Box>
    </Box>
  );
}

/** Signups sparkline over the last 30 days, plus the growth stat row. */
export function GrowthPulse({
  daily,
  signupsToday,
  invitesPending,
  newLibraries7d,
  invitesAccepted30d,
}: GrowthPulseProps) {
  const line = sparklinePath(daily, SPARK_W, SPARK_H);
  const end = sparklineEndpoint(daily, SPARK_W, SPARK_H);

  return (
    <ConsoleCard
      title="GROWTH PULSE"
      action={
        <Box
          component="span"
          sx={{
            fontFamily: '"Roboto Mono", monospace',
            fontSize: '10px',
            color: console_.textMuted,
          }}
        >
          SIGNUPS · LAST 30 DAYS
        </Box>
      }
    >
      <Box
        component="svg"
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        aria-hidden="true"
        sx={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {line && (
          <>
            <path
              d={`${line} L ${SPARK_W} ${SPARK_H} L 0 ${SPARK_H} Z`}
              fill={`${brandColors.inkBlue}12`}
            />
            <path
              d={line}
              fill="none"
              stroke={brandColors.inkBlue}
              strokeWidth={1.5}
            />
          </>
        )}
        {end && (
          <circle cx={end.x} cy={end.y} r={3.5} fill={brandColors.tomatoRed} />
        )}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '12px',
          marginTop: '14px',
        }}
      >
        <Stat value={signupsToday} label="signups today" />
        <Stat value={invitesPending} label="invites pending" />
        <Stat value={newLibraries7d} label="new libraries · 7d" />
        <Stat value={invitesAccepted30d} label="invites accepted · 30d" />
      </Box>
    </ConsoleCard>
  );
}
