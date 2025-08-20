'use client';

import {
  Public as PublicIcon,
  Lock as LockIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Typography,
  IconButton,
  Alert,
  Stack,
} from '@mui/material';
import { useState } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface BranchCreationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (branch: unknown) => void;
}

export function BranchCreationModal({
  open,
  onClose,
  onSuccess,
}: BranchCreationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    isPublic: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isSubmitting) return;
    setFormData({ name: '', description: '', location: '', isPublic: true });
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create branch');
      }

      const { branch } = await response.json();
      onSuccess(branch);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
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
            Start Your Own Branch
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
          Create a sharing community in your neighborhood or with your friends
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Branch Name */}
          <TextField
            fullWidth
            label="Branch Name"
            placeholder="e.g., Mission Bay Neighbors, Downtown Tools"
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
            placeholder="Tell people what your branch is about, what kinds of items you share, or any special focus..."
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            disabled={isSubmitting}
            sx={{ mb: 3 }}
            inputProps={{ maxLength: 500 }}
            helperText={`${formData.description.length}/500 characters`}
          />

          {/* Location */}
          <TextField
            fullWidth
            label="Location"
            placeholder="e.g., Mission Bay, SF or Downtown Portland"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            disabled={isSubmitting}
            sx={{ mb: 3 }}
            helperText="Help people find your branch (optional)"
          />

          {/* Visibility Setting */}
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPublic}
                  onChange={(e) =>
                    handleInputChange('isPublic', e.target.checked)
                  }
                  disabled={isSubmitting}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {formData.isPublic ? (
                    <PublicIcon
                      sx={{ color: brandColors.inkBlue, fontSize: 20 }}
                    />
                  ) : (
                    <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  )}
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                      {formData.isPublic ? 'Public Branch' : 'Private Branch'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formData.isPublic
                        ? 'Anyone can discover and join your branch'
                        : 'People need an invitation to join'}
                    </Typography>
                  </Box>
                </Box>
              }
              sx={{ ml: 0, alignItems: 'flex-start' }}
            />
          </Box>

          {/* Tips */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'rgba(227, 181, 5, 0.1)',
              borderRadius: 1,
              border: `1px solid ${brandColors.mustardYellow}`,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 500, mb: 1, color: brandColors.inkBlue }}
            >
              Tips for Success
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                • Choose a name that reflects your community or focus area
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Public branches grow faster and reach more neighbors
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Add a location to help people find local branches
              </Typography>
            </Stack>
          </Box>
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
            {isSubmitting ? 'Creating...' : 'Create Branch'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
