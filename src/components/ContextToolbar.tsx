'use client';

import { Box, Container, Stack, Button, IconButton, Chip } from '@mui/material';
import { ReactNode } from 'react';

import { brandColors } from '@/theme/brandTokens';

export interface ContextAction {
  type: 'button' | 'icon' | 'chip';
  label?: string;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  size?: 'small' | 'medium' | 'large';
  href?: string;
}

interface ContextToolbarProps {
  actions?: ContextAction[];
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  showDivider?: boolean;
  children?: ReactNode;
}

export function ContextToolbar({
  actions = [],
  leftContent,
  rightContent,
  showDivider = true,
  children,
}: ContextToolbarProps) {
  // Don't render if no content provided
  if (!actions.length && !leftContent && !rightContent && !children) {
    return null;
  }

  const renderAction = (action: ContextAction, index: number) => {
    const key = `action-${index}`;

    switch (action.type) {
      case 'icon':
        return (
          <IconButton
            key={key}
            onClick={action.onClick}
            disabled={action.disabled || false}
            size={action.size || 'medium'}
            sx={{
              color:
                action.color === 'primary' ? brandColors.inkBlue : 'inherit',
              '&:hover': {
                backgroundColor: 'rgba(30, 58, 95, 0.08)',
              },
            }}
          >
            {action.icon}
          </IconButton>
        );

      case 'chip':
        return (
          <Chip
            key={key}
            label={action.label}
            onClick={action.onClick}
            disabled={action.disabled || false}
            size={action.size === 'large' ? 'medium' : 'small'}
            variant={action.variant === 'outlined' ? 'outlined' : 'filled'}
            color={action.color || 'default'}
            icon={action.startIcon as React.ReactElement | undefined}
            sx={{
              fontWeight: 500,
            }}
          />
        );

      case 'button':
      default:
        return (
          <Button
            key={key}
            onClick={action.onClick}
            disabled={action.disabled || false}
            variant={action.variant || 'text'}
            color={action.color || 'primary'}
            size={action.size || 'medium'}
            startIcon={action.startIcon as React.ReactElement | undefined}
            endIcon={action.endIcon as React.ReactElement | undefined}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              minWidth: 'auto',
            }}
          >
            {action.label}
          </Button>
        );
    }
  };

  return (
    <>
      <Box
        sx={{
          backgroundColor: brandColors.white,
          borderBottom: showDivider
            ? `1px solid ${brandColors.softGray}`
            : 'none',
          py: 1,
          minHeight: 48,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ minHeight: 32 }}
          >
            {/* Left Content */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {leftContent}
            </Box>

            {/* Center Content (children or actions) */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flex: 1,
                justifyContent: 'center',
              }}
            >
              {children || (
                <Stack direction="row" spacing={1} alignItems="center">
                  {actions.map(renderAction)}
                </Stack>
              )}
            </Box>

            {/* Right Content */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {rightContent}
            </Box>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
