'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  FormControlLabel,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface Collection {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
}

interface CollectionSelectionModalProps {
  open: boolean;
  itemName: string;
  itemId: string;
  onClose: () => void;
  onComplete: (selectedCollectionIds: string[]) => void;
}

export function CollectionSelectionModal({
  open,
  itemName,
  itemId,
  onClose,
  onComplete,
}: CollectionSelectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's libraries (collections)
  useEffect(() => {
    if (open) {
      fetchCollections();
    }
  }, [open]);

  const fetchCollections = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/collections');
      if (!response.ok) {
        throw new Error('Failed to fetch collections');
      }

      const data = await response.json();
      const userCollections = data.collections || [];

      setCollections(userCollections);
      // Pre-select all collections by default
      if (userCollections.length > 0) {
        setSelectedCollectionIds(
          userCollections.map((collection: Collection) => collection.id)
        );
      }
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError('Failed to load your libraries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCollectionToggle = (collectionId: string) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const handleSave = async () => {
    if (selectedCollectionIds.length === 0) {
      onComplete([]);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Add item to selected libraries
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ libraryIds: selectedCollectionIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to add item to libraries');
      }

      onComplete(selectedCollectionIds);
    } catch (err) {
      console.error('Error saving to libraries:', err);
      setError('Failed to add item to libraries');
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

        {collections.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography
              variant="h6"
              sx={{ mb: 2, color: brandColors.charcoal }}
            >
              Upload Successful! 🎉
            </Typography>
            <Alert severity="info" sx={{ textAlign: 'left' }}>
              Your item was uploaded successfully, but it won&apos;t be visible
              to friends and neighbors until you join or create a collection and
              add it to the shelves.
            </Alert>
          </Box>
        ) : (
          <Box>
            <Typography
              variant="body1"
              sx={{ mb: 3, color: brandColors.charcoal }}
            >
              Great! Your item was uploaded successfully. Choose which
              collections to add it to (you can select multiple):
            </Typography>

            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
              {collections.map((collection) => (
                <FormControlLabel
                  key={collection.id}
                  control={
                    <Checkbox
                      checked={selectedCollectionIds.includes(collection.id)}
                      onChange={() => handleCollectionToggle(collection.id)}
                      sx={{
                        color: brandColors.inkBlue,
                        '&.Mui-checked': {
                          color: brandColors.inkBlue,
                        },
                      }}
                    />
                  }
                  label={
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 500, wordWrap: 'break-word' }}
                      >
                        {collection.name}
                      </Typography>
                      {collection.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {collection.description}
                        </Typography>
                      )}
                    </Box>
                  }
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    mb: 1,
                    width: '100%',
                    ml: 0,
                    mr: 0,
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {collections.length === 0 ? (
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
              disabled={isSaving || selectedCollectionIds.length === 0}
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
              ) : selectedCollectionIds.length > 0 ? (
                `Add to ${selectedCollectionIds.length} ${selectedCollectionIds.length === 1 ? 'Library' : 'Libraries'}`
              ) : (
                'Select Libraries'
              )}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
