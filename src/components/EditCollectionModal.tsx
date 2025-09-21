'use client';

import { Close as CloseIcon } from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface CollectionData {
  id: string;
  name: string;
  description?: string | undefined;
  location?: string | undefined;
  isPublic: boolean;
}

interface EditCollectionModalProps {
  open: boolean;
  onClose: () => void;
  collection: CollectionData;
  onSave: (updatedCollection: Partial<CollectionData>) => Promise<void>;
  onArchiveCollection?: () => void | Promise<void>;
  onDeleteCollection?: () => void | Promise<void>;
}

interface FormData {
  name: string;
  description: string;
  location: string;
  isPublic: boolean;
}

interface FormErrors {
  name?: string;
  description?: string;
  location?: string;
}

export function EditCollectionModal({
  open,
  onClose,
  collection,
  onSave,
  onArchiveCollection,
  onDeleteCollection,
}: EditCollectionModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    location: '',
    isPublic: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showBetaPrivacyNote, setShowBetaPrivacyNote] = useState(false);
  // Transfer ownership controls are handled in ManageMembersModal

  // Initialize form with collection data
  useEffect(() => {
    if (open && collection) {
      setFormData({
        name: collection.name || '',
        description: collection.description ?? '',
        location: collection.location ?? '',
        isPublic: collection.isPublic || false,
      });
      setErrors({});
      setApiError(null);
      setIsDirty(false);
    }
  }, [open, collection]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation - only check if empty since we truncate on input
    if (!formData.name.trim()) {
      newErrors.name = 'Library name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange =
    (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      let value =
        field === 'isPublic' ? event.target.checked : event.target.value;

      // During beta, libraries must remain private
      if (field === 'isPublic' && value === true) {
        setShowBetaPrivacyNote(true);
        // Do not allow enabling public during beta
        value = false;
      }

      // Truncate input based on field limits
      if (field === 'name' && typeof value === 'string') {
        value = value.slice(0, 30);
      } else if (field === 'description' && typeof value === 'string') {
        value = value.slice(0, 500);
      } else if (field === 'location' && typeof value === 'string') {
        value = value.slice(0, 25);
      }

      setFormData((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);

      // Clear field error on change
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
      setApiError(null);
    };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      // Only send changed fields
      const changes: Partial<CollectionData> = {};

      if (formData.name.trim() !== collection.name) {
        changes.name = formData.name.trim();
      }
      if (formData.description !== (collection.description ?? '')) {
        changes.description = formData.description || undefined;
      }
      if (formData.location !== (collection.location ?? '')) {
        changes.location = formData.location || undefined;
      }
      if (formData.isPublic !== collection.isPublic) {
        changes.isPublic = formData.isPublic;
      }

      // Only make API call if there are actual changes
      if (Object.keys(changes).length === 0) {
        onClose();
        return;
      }

      await onSave(changes);
      setIsDirty(false);
      onClose();
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Failed to update collection'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isDirty && !isLoading) {
      if (
        window.confirm(
          'You have unsaved changes. Are you sure you want to close?'
        )
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      handleSave();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box>
          Edit Library
          <Box
            component="span"
            sx={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 400,
              color: brandColors.charcoal,
              opacity: 0.7,
              mt: 0.5,
            }}
          >
            Update your collection details
          </Box>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          disabled={isLoading}
          sx={{ color: brandColors.charcoal, opacity: 0.7 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}

          {/* Library Name */}
          <TextField
            label="Library Name"
            value={formData.name}
            onChange={handleInputChange('name')}
            onKeyDown={handleKeyDown}
            error={!!errors.name}
            helperText={
              errors.name || (
                <span
                  style={{
                    fontWeight: formData.name.length === 30 ? 'bold' : 'normal',
                    color:
                      formData.name.length === 30
                        ? '#d32f2f'
                        : 'rgba(0, 0, 0, 0.6)',
                  }}
                >
                  {formData.name.length}/30 characters
                </span>
              )
            }
            disabled={isLoading}
            required
            fullWidth
            autoFocus
          />

          {/* Description */}
          <TextField
            label="Description"
            value={formData.description}
            onChange={handleInputChange('description')}
            error={!!errors.description}
            helperText={
              errors.description || (
                <span
                  style={{
                    fontWeight:
                      formData.description.length === 500 ? 'bold' : 'normal',
                    color:
                      formData.description.length === 500
                        ? '#d32f2f'
                        : 'rgba(0, 0, 0, 0.6)',
                  }}
                >
                  {formData.description.length}/500 characters
                </span>
              )
            }
            disabled={isLoading}
            multiline
            rows={3}
            fullWidth
            placeholder="Describe your collection..."
          />

          {/* Location */}
          <TextField
            label="Location"
            value={formData.location}
            onChange={handleInputChange('location')}
            onKeyDown={handleKeyDown}
            error={!!errors.location}
            helperText={
              errors.location || (
                <span
                  style={{
                    fontWeight:
                      formData.location.length === 25 ? 'bold' : 'normal',
                    color:
                      formData.location.length === 25
                        ? '#d32f2f'
                        : 'rgba(0, 0, 0, 0.6)',
                  }}
                >
                  {formData.location.length}/25 characters
                </span>
              )
            }
            disabled={isLoading}
            fullWidth
            placeholder="e.g., Downtown, Bldg A"
          />

          {/* Privacy Setting */}
          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPublic}
                  onChange={handleInputChange('isPublic')}
                  disabled={isLoading}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Box component="span" sx={{ fontWeight: 500 }}>
                    {formData.isPublic ? 'Public Library' : 'Private Library'}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      display: 'block',
                      fontSize: '0.875rem',
                      color: brandColors.charcoal,
                      opacity: 0.7,
                      mt: 0.5,
                    }}
                  >
                    {formData.isPublic
                      ? 'Anyone can discover and request to join this library'
                      : 'Only people you invite can join this library'}
                  </Box>
                  {showBetaPrivacyNote && (
                    <Box
                      sx={{
                        mt: 1,
                        fontSize: '0.875rem',
                        color: '#FF6347', // tomato
                        bgcolor: 'rgba(255, 99, 71, 0.08)',
                        border: '1px solid rgba(255, 99, 71, 0.3)',
                        borderRadius: 1,
                        p: 1,
                      }}
                    >
                      During our beta period, all libraries are private. Thanks
                      for your patience — public libraries are coming soon.
                    </Box>
                  )}
                </Box>
              }
            />
          </Box>

          {/* Danger Zone */}
          {(onArchiveCollection || onDeleteCollection) && (
            <Box
              sx={{
                mt: 1,
                pt: 1,
                borderTop: `1px dashed ${brandColors.softGray}`,
              }}
            >
              <Box sx={{ mb: 1 }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'rgba(0,0,0,0.6)',
                  }}
                >
                  Danger Zone
                </span>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {onArchiveCollection && (
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={onArchiveCollection}
                    disabled={isLoading}
                    sx={{ textTransform: 'none' }}
                  >
                    Archive Library
                  </Button>
                )}
                {onDeleteCollection && (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={onDeleteCollection}
                    disabled={isLoading}
                    sx={{ textTransform: 'none' }}
                  >
                    Delete Library
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button
          onClick={handleClose}
          disabled={isLoading}
          sx={{ color: brandColors.charcoal }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isLoading || Object.keys(errors).length > 0}
          variant="contained"
          sx={{
            bgcolor: brandColors.inkBlue,
            '&:hover': { bgcolor: '#1a2f4f' },
            minWidth: 120,
          }}
        >
          {isLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            'Save Changes'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
