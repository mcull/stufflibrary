'use client';

import { Close as CloseIcon } from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Alert,
} from '@mui/material';
import { useState } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface LibraryCreationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (library: unknown) => void;
  createLibrary?: (libraryData: {
    name: string;
    description?: string;
    location?: string;
    isPublic?: boolean;
  }) => Promise<unknown>;
}

export function LibraryCreationModal({
  open,
  onClose,
  onSuccess,
  createLibrary,
}: LibraryCreationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    isPublic: false, // Default to private for MVP
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isSubmitting) return;
    setFormData({ name: '', description: '', location: '', isPublic: false });
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (createLibrary) {
        // Use the provided createLibrary function
        const library = await createLibrary(formData);
        onSuccess(library);
      } else {
        // Fallback to direct API call if createLibrary not provided
        const response = await fetch('/api/libraries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create library');
        }

        const { library } = await response.json();
        onSuccess(library);
      }

      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create library');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const isNameValid = formData.name.trim().length > 0;
  const isFormValid = isNameValid && formData.name.length <= 100;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundColor: brandColors.warmCream,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="h5"
            component="h2"
            sx={{ fontWeight: 600, color: brandColors.inkBlue }}
          >
            Create Your Library
          </Typography>
          <IconButton
            onClick={handleClose}
            disabled={isSubmitting}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Start a private sharing community with people you trust
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Library Name */}
          <TextField
            fullWidth
            label="Library Name"
            placeholder="e.g., Family Sharing Circle, Neighbors Tool Library"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            error={formData.name.length > 100}
            helperText={
              formData.name.length > 100
                ? 'Name must be 100 characters or less'
                : `${formData.name.length}/100 characters`
            }
            required
            disabled={isSubmitting}
            sx={{ mb: 3 }}
            inputProps={{ maxLength: 100 }}
          />

          {/* Description */}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            placeholder="Tell people what your library is about, what kinds of items you share, or any special focus..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            disabled={isSubmitting}
            inputProps={{ maxLength: 500 }}
            helperText={`${formData.description.length}/500 characters`}
          />
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isFormValid || isSubmitting}
            sx={{
              bgcolor: brandColors.inkBlue,
              '&:hover': { bgcolor: '#1a2f4f' },
              '&:disabled': { bgcolor: 'grey.300' },
            }}
          >
            {isSubmitting ? 'Creating...' : 'Create Library'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
