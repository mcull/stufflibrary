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
                // Digital tab semantics (#435): the FILLED tab is selected.
                border: `2px solid ${brandColors.inkBlue}`,
                borderBottom: 'none',
                borderRadius: '4px 4px 0 0',
                cursor: 'pointer',
                background: active ? brandColors.inkBlue : vintage.drawerPaper,
                color: active ? brandColors.warmCream : brandColors.inkBlue,
                transition: 'background 0.15s ease, color 0.15s ease',
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
          borderRadius: '0 4px 4px 4px',
          background: vintage.drawerPaper,
          padding: { xs: '24px 16px 32px', md: '40px 40px 48px' },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
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
