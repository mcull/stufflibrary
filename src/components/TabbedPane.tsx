'use client';

import { Box, Button, Typography } from '@mui/material';
import React from 'react';

import { brandColors } from '@/theme/brandTokens';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabbedPaneProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'contained';
}

export function TabbedPane({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
}: TabbedPaneProps) {
  const activeTabItem = tabs.find((tab) => tab.id === activeTab);

  return (
    <Box>
      {/* Tab Navigation */}
      <Box
        role="tablist"
        sx={{
          display: 'flex',
          borderBottom:
            variant === 'default'
              ? `2px solid ${brandColors.softGray}`
              : 'none',
          mb: 3,
          gap: variant === 'contained' ? 1 : 0,
          backgroundColor:
            variant === 'contained' ? brandColors.warmCream : 'transparent',
          borderRadius: variant === 'contained' ? 2 : 0,
          p: variant === 'contained' ? 0.5 : 0,
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <Button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              variant={
                variant === 'contained'
                  ? isActive
                    ? 'contained'
                    : 'text'
                  : 'text'
              }
              sx={{
                minWidth: 'auto',
                px: variant === 'contained' ? 3 : 2,
                py: variant === 'contained' ? 1.5 : 2,
                borderRadius: variant === 'contained' ? 1.5 : 0,
                textTransform: 'none',
                fontWeight: isActive ? 600 : 500,
                fontSize: '1rem',
                color:
                  variant === 'contained'
                    ? isActive
                      ? brandColors.white
                      : brandColors.charcoal
                    : isActive
                      ? brandColors.inkBlue
                      : brandColors.charcoal,
                backgroundColor:
                  variant === 'contained'
                    ? isActive
                      ? brandColors.inkBlue
                      : 'transparent'
                    : 'transparent',
                borderBottom:
                  variant === 'default'
                    ? isActive
                      ? `3px solid ${brandColors.inkBlue}`
                      : '3px solid transparent'
                    : 'none',
                '&:hover': {
                  backgroundColor:
                    variant === 'contained'
                      ? isActive
                        ? brandColors.inkBlue
                        : `${brandColors.softGray}50`
                      : `${brandColors.inkBlue}08`,
                  color:
                    variant === 'contained'
                      ? isActive
                        ? brandColors.white
                        : brandColors.charcoal
                      : brandColors.inkBlue,
                },
                '&:focus': {
                  outline: `2px solid ${brandColors.inkBlue}`,
                  outlineOffset: '2px',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Typography
                component="span"
                variant="inherit"
                sx={{
                  fontWeight: 'inherit',
                  fontSize: 'inherit',
                }}
              >
                {tab.label}
              </Typography>
            </Button>
          );
        })}
      </Box>

      {/* Tab Content */}
      {activeTabItem && (
        <Box
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          sx={{
            outline: 'none',
            '&:focus': {
              outline: `2px solid ${brandColors.inkBlue}`,
              outlineOffset: '2px',
            },
          }}
          tabIndex={0}
        >
          {activeTabItem.content}
        </Box>
      )}
    </Box>
  );
}
