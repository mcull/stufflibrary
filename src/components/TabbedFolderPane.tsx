'use client';

import { Box, Button } from '@mui/material';
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
  showAddButton?: boolean; // Keep for API compatibility
}

export function TabbedFolderPane({
  tabs,
  activeTab,
  onChange,
  showAddButton: _showAddButton = true, // Prefix with underscore to avoid unused warning
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
                  px: { xs: 2, md: 3 },
                  py: 2,
                  borderRadius: 0,
                  textTransform: 'none',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: { xs: '1rem', md: '1.1rem' },
                  fontFamily: 'var(--font-inter)',
                  position: 'relative',
                  backgroundColor: 'transparent',
                  color: isActive ? brandColors.charcoal : '#6B7280',
                  border: 'none',
                  boxShadow: 'none',
                  transition: 'all 0.2s ease',

                  // Simple underline for active tab
                  '&::after': isActive
                    ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: { xs: 8, md: 12 },
                        right: { xs: 8, md: 12 },
                        height: '3px',
                        backgroundColor: brandColors.inkBlue,
                        borderRadius: '2px 2px 0 0',
                      }
                    : {},

                  // Simple hover effects
                  '&:hover': {
                    backgroundColor: 'transparent',
                    color: isActive
                      ? brandColors.charcoal
                      : brandColors.inkBlue,
                  },

                  // No pressed state styling needed
                  '&:active': {
                    backgroundColor: 'transparent',
                  },
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Box>
      </Box>

      {/* Tab Content Container */}
      <Box
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        sx={{
          mt: 2, // Add some spacing from tabs
        }}
      >
        {activeTabItem?.content}
      </Box>
    </Box>
  );
}
