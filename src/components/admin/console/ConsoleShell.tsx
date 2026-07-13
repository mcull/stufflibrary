'use client';

import { Box } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { VintageStamp } from '@/components/member-home/VintageStamp';
import { vintageFonts } from '@/components/member-home/vintageTokens';
import { isTabActive } from '@/lib/admin/desk';
import { brandColors } from '@/theme/brandTokens';

import { console_, consoleType } from './tokens';

const TABS = [
  { label: 'DESK', href: '/admin' },
  { label: 'MEMBERS', href: '/admin/members' },
  { label: 'LIBRARIES', href: '/admin/libraries' },
  { label: 'ITEMS', href: '/admin/items' },
  { label: 'BORROWS', href: '/admin/borrows' },
  { label: 'AUDIT', href: '/admin/audit' },
] as const;

/** `JUL 13 2026` — the date the desk stamp wears today. */
function dateStampLabel(d: Date): string {
  return d
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    .replace(',', '')
    .toUpperCase();
}

/** Ticking 24h wall clock; `--:--:--` until mounted so hydration matches. */
function useWallClock(): string {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(
        [d.getHours(), d.getMinutes(), d.getSeconds()]
          .map((n) => String(n).padStart(2, '0'))
          .join(':')
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return time ?? '--:--:--';
}

interface ConsoleShellProps {
  userName: string;
  children: React.ReactNode;
}

/** The Circulation Desk chrome: wordmark, date stamp, clock, tab nav. */
export function ConsoleShell({ userName, children }: ConsoleShellProps) {
  const pathname = usePathname() ?? '';
  const clock = useWallClock();

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: brandColors.warmCream }}>
      <Box component="header">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            padding: '12px 24px',
          }}
        >
          {/* Left: wordmark chip + desk overline */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Link href="/admin" style={{ textDecoration: 'none' }}>
              {/* Label-maker chip wordmark (#429), same as GlobalHeader. */}
              <Box
                component="span"
                className="vintage-impact-label"
                sx={{
                  fontFamily: vintageFonts.label,
                  fontSize: '18px',
                  color: brandColors.warmCream,
                  background: brandColors.tomatoRed,
                  padding: '3px 8px',
                  transform: 'rotate(-1.2deg)',
                  display: 'inline-block',
                  lineHeight: 1.2,
                }}
              >
                STUFFLIBRARY
              </Box>
            </Link>
            <Box
              component="span"
              sx={{ ...consoleType.overline, color: console_.textMuted }}
            >
              ADMIN · CIRCULATION DESK
            </Box>
          </Box>

          {/* Right: date stamp, clock, avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <VintageStamp
              label={dateStampLabel(new Date())}
              ink={console_.stampRed}
              rotation={-2}
              fontSize={10}
            />
            <Box
              component="span"
              sx={{
                fontFamily: vintageFonts.mono,
                fontSize: '13px',
                color: console_.textSecondary,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {clock}
            </Box>
            <Box
              component="span"
              aria-hidden
              sx={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: brandColors.inkBlue,
                color: brandColors.warmCream,
                fontFamily: vintageFonts.serif,
                fontWeight: 700,
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {(userName.trim().charAt(0) || 'A').toUpperCase()}
            </Box>
          </Box>
        </Box>

        {/* 2px ink rule under the header */}
        <Box sx={{ borderBottom: `2px solid ${brandColors.inkBlue}` }} />

        {/* Tab nav */}
        <Box
          component="nav"
          aria-label="Admin sections"
          sx={{ display: 'flex', gap: 3, padding: '0 24px' }}
        >
          {TABS.map((tab) => {
            const active = isTabActive(pathname, tab.href);
            return (
              <Box
                key={tab.href}
                component={Link}
                href={tab.href}
                {...(active ? { 'aria-current': 'page' as const } : {})}
                sx={{
                  fontFamily: vintageFonts.mono,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  textDecoration: 'none',
                  padding: '10px 2px 7px',
                  color: active ? brandColors.inkBlue : console_.textMuted,
                  fontWeight: active ? 700 : 400,
                  borderBottom: active
                    ? `3px solid ${brandColors.mustardYellow}`
                    : '3px solid transparent',
                }}
              >
                {tab.label}
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box sx={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
        {children}
      </Box>
    </Box>
  );
}
