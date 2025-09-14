'use client';

import { AddAPhotoTwoTone as AddAPhotoIcon } from '@mui/icons-material';
import { Box, Button, IconButton } from '@mui/material';
import Link from 'next/link';
import React from 'react';

import { brandColors } from '@/theme/brandTokens';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabbedFolderPaneProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  showAddButton?: boolean;
}

export function TabbedFolderPane({
  tabs,
  activeTab,
  onChange,
  showAddButton = true,
}: TabbedFolderPaneProps) {
  const activeTabItem = tabs.find((tab) => tab.id === activeTab);

  return (
    <Box>
      {/* Tabbed Folder Navigation */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex', // Show on both mobile and desktop
          alignItems: 'flex-end',
          mb: 0,
        }}
      >
        {/* Tabs */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;

            return (
              <Button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                sx={{
                  minWidth: 'auto',
                  px: 4,
                  py: 2,
                  borderRadius: '16px 16px 0 0',
                  textTransform: 'none',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.95rem',
                  position: 'relative',
                  zIndex: isActive ? 3 : 1,
                  backgroundColor: isActive
                    ? brandColors.white
                    : brandColors.warmCream,
                  color: isActive ? brandColors.charcoal : '#666666',
                  border: `2px solid ${isActive ? brandColors.softGray : 'transparent'}`,
                  borderBottom: isActive ? 'none' : 'none',
                  // Magical shadow effects
                  boxShadow: isActive
                    ? `0 -4px 16px rgba(0, 0, 0, 0.08), 0 -2px 8px rgba(0, 0, 0, 0.05)`
                    : '0 1px 3px rgba(0, 0, 0, 0.02)',
                  marginBottom: isActive ? '-2px' : '0',
                  // Smooth transitions with personality
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isActive
                    ? 'translateY(-1px) scale(1.02)'
                    : 'translateY(0) scale(1)',

                  // Hand-drawn underline effect for active tab
                  '&::after': isActive
                    ? {
                        content: '""',
                        position: 'absolute',
                        bottom: '-8px',
                        left: '20%',
                        right: '20%',
                        height: '4px',
                        backgroundImage: 'url(/highlight1.png)', // Hand-drawn underline
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        opacity: 0.8,
                        transform: 'rotate(-0.5deg)',
                        zIndex: 2,
                        animation:
                          'tabUnderlineSlide 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      }
                    : {},

                  // Delightful hover effects
                  '&:hover': {
                    backgroundColor: isActive ? brandColors.white : '#F2EFE6',
                    boxShadow: isActive
                      ? `0 -4px 16px rgba(0, 0, 0, 0.08), 0 -2px 8px rgba(0, 0, 0, 0.05)`
                      : '0 2px 8px rgba(0, 0, 0, 0.06)',
                    transform: isActive
                      ? 'translateY(-1px) scale(1.02)'
                      : 'translateY(-0.5px) scale(1.01)',
                    color: isActive
                      ? brandColors.charcoal
                      : brandColors.inkBlue,
                  },

                  // Pressed state for tactile feedback
                  '&:active': {
                    transform: isActive
                      ? 'translateY(0) scale(1.01)'
                      : 'translateY(0) scale(0.99)',
                    transition: 'all 0.1s ease',
                  },

                  // Add tab animation keyframes
                  '@keyframes tabUnderlineSlide': {
                    '0%': {
                      opacity: 0,
                      transform: 'rotate(-0.5deg) scaleX(0)',
                    },
                    '100%': {
                      opacity: 0.8,
                      transform: 'rotate(-0.5deg) scaleX(1)',
                    },
                  },
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Box>

        {/* Desktop Add Button */}
        {showAddButton && (
          <Box
            sx={{
              ml: 'auto',
              pb: 1.5,
              pr: 2,
            }}
          >
            <IconButton
              component={Link}
              href="/add-item"
              sx={{
                backgroundColor: brandColors.mustardYellow,
                color: brandColors.charcoal,
                width: 44,
                height: 44,
                border: `2px solid ${brandColors.white}`,
                boxShadow:
                  '0 3px 12px rgba(227, 181, 5, 0.3), 0 1px 4px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Bouncy easing
                position: 'relative',
                '&:hover': {
                  backgroundColor: '#C19E04',
                  transform: 'translateY(-2px) scale(1.05)',
                  boxShadow:
                    '0 6px 20px rgba(227, 181, 5, 0.4), 0 2px 8px rgba(0, 0, 0, 0.15)',
                },
                '&:active': {
                  transform: 'translateY(-1px) scale(1.02)',
                  transition: 'all 0.1s ease',
                },
                // Add a subtle hand-drawn circle background
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '-4px',
                  left: '-4px',
                  right: '-4px',
                  bottom: '-4px',
                  backgroundImage: 'url(/highlight2.png)',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  opacity: 0.3,
                  transform: 'rotate(5deg)',
                  zIndex: -1,
                },
              }}
            >
              <AddAPhotoIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Tab Content Container */}
      <Box
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        sx={{
          position: 'relative',
          zIndex: 1,
          // Traditional folder styling with border
          border: { xs: 'none', md: `1px solid ${brandColors.softGray}` },
          borderRadius: { xs: 0, md: '0 12px 12px 12px' },
          backgroundColor: 'transparent',
          // Ensure the active tab appears connected
          borderTopLeftRadius: {
            xs: 0,
            md: activeTab === tabs[0]?.id ? 0 : 12,
          },
        }}
      >
        {activeTabItem?.content}
      </Box>
    </Box>
  );
}
