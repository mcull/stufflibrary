'use client';

import { PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { Button, Tooltip } from '@mui/material';

import { brandColors } from '@/theme/brandTokens';

interface InviteButtonProps {
  onClick: () => void;
  size?: 'small' | 'medium' | 'large';
  variant?: 'text' | 'outlined' | 'contained';
  disabled?: boolean;
}

export function InviteButton({
  onClick,
  size = 'medium',
  variant = 'outlined',
  disabled = false,
}: InviteButtonProps) {
  return (
    <Tooltip title="Invite friends to join this branch">
      <Button
        variant={variant}
        size={size}
        startIcon={<PersonAddIcon />}
        onClick={onClick}
        disabled={disabled}
        sx={{
          color:
            variant === 'contained' ? brandColors.white : brandColors.inkBlue,
          bgcolor:
            variant === 'contained' ? brandColors.inkBlue : 'transparent',
          borderColor: brandColors.inkBlue,
          '&:hover': {
            bgcolor:
              variant === 'contained' ? '#1a2f4f' : 'rgba(37, 99, 235, 0.04)',
            borderColor: '#1a2f4f',
          },
          '&:disabled': {
            bgcolor: 'grey.300',
            color: 'grey.600',
            borderColor: 'grey.300',
          },
        }}
      >
        Invite Friends
      </Button>
    </Tooltip>
  );
}
