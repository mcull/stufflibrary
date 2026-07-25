'use client';

import { Close as CloseIcon } from '@mui/icons-material';
import { Box, Button, IconButton, Typography } from '@mui/material';

import { brandColors } from '@/theme/brandTokens';

export interface ArrivalWelcomeProps {
  name?: string | null;
  onBrowse: () => void;
  onAdd: () => void;
  onDismiss: () => void;
}

export function ArrivalWelcome({
  name,
  onBrowse,
  onAdd,
  onDismiss,
}: ArrivalWelcomeProps) {
  const firstName = name?.trim() ? name.trim().split(/\s+/)[0] : null;
  return (
    <Box
      sx={{
        mb: 4,
        p: 3,
        borderRadius: 2,
        border: `1.5px solid ${brandColors.inkBlue}`,
        bgcolor: brandColors.warmCream,
        position: 'relative',
      }}
    >
      <IconButton
        aria-label="close"
        size="small"
        onClick={onDismiss}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: brandColors.charcoal,
        }}
      >
        <CloseIcon fontSize="inherit" />
      </IconButton>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Typography
          component="h2"
          sx={{
            fontFamily: 'var(--font-merriweather), Georgia, serif',
            fontSize: '1.5rem',
            color: brandColors.inkBlue,
          }}
        >
          {firstName ? `Welcome in, ${firstName}` : 'Welcome in'}
        </Typography>
        <Box
          component="span"
          sx={{
            fontFamily: 'var(--font-roboto-mono), monospace',
            fontSize: '0.7rem',
            letterSpacing: 1.5,
            color: brandColors.tomatoRed,
            border: `2px solid ${brandColors.tomatoRed}`,
            borderRadius: 1,
            px: 0.75,
            py: 0.25,
            transform: 'rotate(-6deg)',
          }}
        >
          MEMBER
        </Box>
      </Box>

      <Typography variant="body2" sx={{ color: brandColors.charcoal, mb: 2 }}>
        You&rsquo;re in — the neighbors are yours to meet, the shelves yours to
        borrow from.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          onClick={onBrowse}
          sx={{
            bgcolor: brandColors.inkBlue,
            '&:hover': { bgcolor: '#1a2f4f' },
            textTransform: 'none',
          }}
        >
          Browse the shelves
        </Button>
        <Button
          variant="outlined"
          onClick={onAdd}
          sx={{
            color: brandColors.inkBlue,
            borderColor: brandColors.inkBlue,
            textTransform: 'none',
          }}
        >
          Add your first thing
        </Button>
      </Box>
    </Box>
  );
}
