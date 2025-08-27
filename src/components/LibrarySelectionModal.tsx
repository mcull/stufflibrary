'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface Library {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
}

interface LibrarySelectionModalProps {
  open: boolean;
  itemName: string;
  itemId: string;
  onClose: () => void;
  onComplete: (selectedLibraryIds: string[]) => void;
}

export function LibrarySelectionModal({
  open,
  itemName,
  itemId,
  onClose,
  onComplete,
}: LibrarySelectionModalProps) {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's libraries
  useEffect(() => {
    if (open) {
      fetchLibraries();
    }
  }, [open]);

  const fetchLibraries = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/branches');
      if (!response.ok) {
        throw new Error('Failed to fetch libraries');
      }

      const data = await response.json();
      const userLibraries = data.branches || [];

      setLibraries(userLibraries);
      // Select first library by default if available
      if (userLibraries.length > 0) {
        setSelectedLibraryId(userLibraries[0].id);
      }
    } catch (err) {
      console.error('Error fetching libraries:', err);
      setError('Failed to load your libraries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLibrarySelect = (libraryId: string) => {
    setSelectedLibraryId(libraryId);
  };

  const handleSave = async () => {
    if (!selectedLibraryId) {
      onComplete([]);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Add item to selected library
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ branchId: selectedLibraryId }),
      });

      if (!response.ok) {
        throw new Error('Failed to add item to library');
      }

      onComplete([selectedLibraryId]);
    } catch (err) {
      console.error('Error saving to library:', err);
      setError('Failed to add item to library');
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onComplete([]);
  };

  if (isLoading) {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 4,
            }}
          >
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography>Loading your libraries...</Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1, fontWeight: 600, fontSize: '1.5rem' }}>
        Add &ldquo;{itemName}&rdquo; to Libraries
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {libraries.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography
              variant="h6"
              sx={{ mb: 2, color: brandColors.charcoal }}
            >
              Upload Successful! 🎉
            </Typography>
            <Alert severity="info" sx={{ textAlign: 'left' }}>
              Your item was uploaded successfully, but it won&apos;t be visible
              to friends and neighbors until you join or create a library and
              add it to the shelves.
            </Alert>
          </Box>
        ) : (
          <Box>
            <Typography
              variant="body1"
              sx={{ mb: 3, color: brandColors.charcoal }}
            >
              Great! Your item was uploaded successfully. Choose which libraries
              to add it to:
            </Typography>

            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
              <RadioGroup
                value={selectedLibraryId}
                onChange={(e) => handleLibrarySelect(e.target.value)}
              >
                {libraries.map((library) => (
                  <FormControlLabel
                    key={library.id}
                    value={library.id}
                    control={
                      <Radio
                        sx={{
                          color: brandColors.inkBlue,
                          '&.Mui-checked': {
                            color: brandColors.inkBlue,
                          },
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {library.name}
                        </Typography>
                        {library.description && (
                          <Typography variant="caption" color="text.secondary">
                            {library.description}
                          </Typography>
                        )}
                      </Box>
                    }
                    sx={{ display: 'block', mb: 1 }}
                  />
                ))}

                <FormControlLabel
                  value=""
                  control={
                    <Radio
                      sx={{
                        color: brandColors.inkBlue,
                        '&.Mui-checked': {
                          color: brandColors.inkBlue,
                        },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Keep private for now
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        You can add it to a library later
                      </Typography>
                    </Box>
                  }
                  sx={{ display: 'block', mt: 2 }}
                />
              </RadioGroup>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {libraries.length === 0 ? (
          <Button
            onClick={handleSkip}
            variant="contained"
            sx={{
              backgroundColor: brandColors.inkBlue,
              '&:hover': {
                backgroundColor: '#1a2f4f',
              },
            }}
          >
            Got it
          </Button>
        ) : (
          <>
            <Button onClick={handleSkip} color="inherit">
              Skip for now
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={isSaving}
              sx={{
                backgroundColor: brandColors.inkBlue,
                '&:hover': {
                  backgroundColor: '#1a2f4f',
                },
              }}
            >
              {isSaving ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Adding...
                </>
              ) : selectedLibraryId ? (
                `Add to Library`
              ) : (
                'Keep Private'
              )}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
