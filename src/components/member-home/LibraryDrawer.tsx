'use client';

import { Box } from '@mui/material';
import type { ReactNode } from 'react';

import { brandColors } from '@/theme/brandTokens';

import { vintage, vintageFonts } from './vintageTokens';

interface DrawerTab {
  id: string;
  label: string;
}

interface LibraryDrawerProps {
  tabs: DrawerTab[];
  activeTab: string;
  onChange: (id: string) => void;
  children: ReactNode;
}

/** Card-catalog drawer: two pull tabs and the paper-lined body. */
export function LibraryDrawer({
  tabs,
  activeTab,
  onChange,
  children,
}: LibraryDrawerProps) {
  return (
    <Box>
      <Box sx={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <Box
              key={tab.id}
              component="button"
              onClick={() => onChange(tab.id)}
              sx={{
                fontFamily: vintageFonts.mono,
                fontSize: { xs: '13px', sm: '15px' },
                fontWeight: 700,
                letterSpacing: '0.06em',
                padding: { xs: '12px 18px 10px', sm: '14px 28px 12px' },
                border: `2px solid ${brandColors.inkBlue}`,
                borderBottom: 'none',
                borderRadius: '10px 10px 0 0',
                cursor: 'pointer',
                background: active ? vintage.drawerPaper : brandColors.inkBlue,
                color: active ? brandColors.inkBlue : brandColors.warmCream,
              }}
            >
              {tab.label}
            </Box>
          );
        })}
      </Box>
      <Box
        sx={{
          border: `2px solid ${brandColors.inkBlue}`,
          borderRadius: '0 10px 10px 10px',
          background: vintage.drawerPaper,
          padding: { xs: '24px 16px 32px', md: '40px 40px 48px' },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Coffee ring: someone read here with a mug. */}
        <Box
          component="img"
          src="/coffee_stains/noun-coffee-ring-1071952.svg"
          alt=""
          sx={{
            position: 'absolute',
            width: 260,
            right: -40,
            bottom: -50,
            opacity: 0.05,
            pointerEvents: 'none',
          }}
        />
        <Box sx={{ position: 'relative' }}>{children}</Box>
      </Box>
    </Box>
  );
}

/** ★ SECTION LABEL ★ in stamp brown. */
export function DrawerSectionLabel({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        fontFamily: vintageFonts.stamp,
        fontSize: '15px',
        letterSpacing: '0.22em',
        color: vintage.stampBrown,
        mb: '24px',
      }}
    >
      ★ {children} ★
    </Box>
  );
}
