'use client';

import { Box } from '@mui/material';
import Link from 'next/link';

import { brandColors } from '@/theme/brandTokens';

import { ConsoleCard } from './cards';
import { console_, consoleType } from './tokens';

interface OnTheDeskProps {
  openReports: number;
  activeDisputes: number;
  overdueBorrows: number;
}

function CountPill({ count }: { count: number }) {
  return (
    <Box
      component="span"
      sx={{
        ...consoleType.deltaLine,
        borderRadius: '999px',
        padding: '1px 9px',
        minWidth: '26px',
        textAlign: 'center',
        ...(count > 0
          ? {
              backgroundColor: brandColors.tomatoRed,
              color: brandColors.warmCream,
            }
          : {
              border: `1px solid ${console_.textFaint}`,
              color: console_.textMuted,
            }),
      }}
    >
      {count}
    </Box>
  );
}

/** The pile needing a librarian's attention, each row a link to its queue. */
export function OnTheDesk({
  openReports,
  activeDisputes,
  overdueBorrows,
}: OnTheDeskProps) {
  const rows = [
    { label: 'Open reports', href: '/admin/analytics', count: openReports },
    {
      label: 'Active disputes',
      href: '/admin/analytics',
      count: activeDisputes,
    },
    { label: 'Overdue borrows', href: '/admin/borrows', count: overdueBorrows },
  ];

  return (
    <ConsoleCard title="ON THE DESK">
      <Box>
        {rows.map((row, i) => (
          <Box
            key={row.label}
            component={Link}
            href={row.href}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '9px 4px',
              textDecoration: 'none',
              borderTop: i > 0 ? `1px dashed ${console_.dashedLine}` : 'none',
              '&:hover': { backgroundColor: console_.rowHover },
            }}
          >
            <Box
              component="span"
              sx={{
                fontFamily: '"Roboto Mono", monospace',
                fontSize: '12px',
                color: console_.textSecondary,
              }}
            >
              {row.label}
            </Box>
            <CountPill count={row.count} />
          </Box>
        ))}
      </Box>
    </ConsoleCard>
  );
}
