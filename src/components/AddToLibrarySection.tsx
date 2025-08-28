'use client';

import {
  PhotoCamera as PhotoCameraIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import { Box, Button, Typography, Stack } from '@mui/material';
import { useRouter } from 'next/navigation';

import { brandColors } from '@/theme/brandTokens';

interface AddToLibrarySectionProps {
  libraryId: string;
  libraryName: string;
  userRole: 'owner' | 'admin' | 'member' | null;
}

export function AddToLibrarySection({
  libraryId,
  libraryName,
  userRole,
}: AddToLibrarySectionProps) {
  const router = useRouter();

  if (!userRole) {
    return null; // Don't show to non-members
  }

  const handleAddNewItem = () => {
    // Navigate to camera-based add item flow with library pre-selected
    const params = new URLSearchParams({
      library: libraryId,
    });
    router.push(`/add-item?${params.toString()}`);
  };

  const handleAddFromInventory = () => {
    // Navigate to inventory selection for this library
    // TODO: Create inventory selection modal/page
    router.push(`/stuff/m/add-to-library/${libraryId}`);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="subtitle1"
        sx={{
          mb: 1.5,
          fontSize: '1rem',
          fontWeight: 600,
          color: 'text.primary',
        }}
      >
        Share with {libraryName}
      </Typography>

      <Stack direction="row" spacing={2}>
        {/* Add New Item Button */}
        <Button
          onClick={handleAddNewItem}
          variant="outlined"
          startIcon={<PhotoCameraIcon />}
          sx={{
            flex: 1,
            py: 1.5,
            border: `1px solid ${brandColors.inkBlue}`,
            color: brandColors.inkBlue,
            '&:hover': {
              bgcolor: 'rgba(25, 118, 210, 0.08)',
              border: `1px solid ${brandColors.inkBlue}`,
            },
          }}
        >
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Add New Item
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Take photo
            </Typography>
          </Box>
        </Button>

        {/* Add from Inventory Button */}
        <Button
          onClick={handleAddFromInventory}
          variant="outlined"
          startIcon={<InventoryIcon />}
          sx={{
            flex: 1,
            py: 1.5,
            border: `1px solid ${brandColors.mustardYellow}`,
            color: brandColors.charcoal,
            '&:hover': {
              bgcolor: 'rgba(244, 187, 68, 0.08)',
              border: `1px solid ${brandColors.mustardYellow}`,
            },
          }}
        >
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              From Inventory
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Select existing
            </Typography>
          </Box>
        </Button>
      </Stack>
    </Box>
  );
}
