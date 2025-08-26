'use client';

import { TextFields } from '@mui/icons-material';
import { Button, Tooltip } from '@mui/material';

import { useFontToggle } from '@/hooks/useFontToggle';
import { brandColors } from '@/theme/brandTokens';

interface FontToggleProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'text' | 'outlined' | 'contained';
}

export function FontToggle({
  size = 'small',
  variant = 'outlined',
}: FontToggleProps) {
  const { currentFontName, toggleFont } = useFontToggle();

  return (
    <Tooltip title={`Switch font (currently: ${currentFontName})`}>
      <Button
        onClick={toggleFont}
        size={size}
        variant={variant}
        startIcon={<TextFields />}
        sx={{
          minWidth: 'auto',
          borderColor: brandColors.softGray,
          color: brandColors.charcoal,
          '&:hover': {
            borderColor: brandColors.inkBlue,
            backgroundColor: 'rgba(30, 58, 95, 0.08)',
          },
        }}
      >
        {currentFontName}
      </Button>
    </Tooltip>
  );
}
