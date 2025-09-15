'use client';

import {
  Close as CloseIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Divider,
  Typography,
  Chip,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { useState } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface CollectionData {
  id: string;
  name: string;
  description?: string;
  location?: string;
  isPublic: boolean;
  memberCount: number;
  itemCount: number;
  isOwner: boolean;
  isAdmin: boolean;
}

interface CollectionSettingsModalProps {
  open: boolean;
  onClose: () => void;
  collection: CollectionData;
  onEditCollection: () => void;
  onManageMembers: () => void;
  onToggleVisibility: (isPublic: boolean) => Promise<void>;
  onArchiveCollection?: () => void;
  onDeleteCollection?: () => void;
}

export function CollectionSettingsModal({
  open,
  onClose,
  collection,
  onEditCollection,
  onManageMembers,
  onToggleVisibility,
  onArchiveCollection,
  onDeleteCollection,
}: CollectionSettingsModalProps) {
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVisibilityToggle = async (checked: boolean) => {
    setIsTogglingVisibility(true);
    setError(null);
    try {
      await onToggleVisibility(checked);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update visibility'
      );
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const handleEditClick = () => {
    onClose();
    onEditCollection();
  };

  const handleManageMembersClick = () => {
    onClose();
    onManageMembers();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          Collection Settings
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage your collection preferences
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ color: brandColors.charcoal, opacity: 0.7 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1, pb: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontSize: '1.1rem' }}>
            {collection.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              icon={
                collection.isPublic ? <VisibilityIcon /> : <VisibilityOffIcon />
              }
              label={collection.isPublic ? 'Public' : 'Private'}
              variant="outlined"
              size="small"
            />
            <Chip
              label={`${collection.memberCount} member${collection.memberCount !== 1 ? 's' : ''}`}
              variant="outlined"
              size="small"
            />
            <Chip
              label={`${collection.itemCount} item${collection.itemCount !== 1 ? 's' : ''}`}
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>

        <List sx={{ p: 0 }}>
          {/* General Settings */}
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ px: 2, py: 1 }}
          >
            General
          </Typography>

          <ListItem disablePadding>
            <ListItemButton onClick={handleEditClick}>
              <ListItemIcon>
                <EditIcon />
              </ListItemIcon>
              <ListItemText
                primary="Edit Collection"
                secondary="Change name, description, and location"
              />
            </ListItemButton>
          </ListItem>

          <ListItem sx={{ px: 2 }}>
            <ListItemIcon>
              {collection.isPublic ? <VisibilityIcon /> : <VisibilityOffIcon />}
            </ListItemIcon>
            <ListItemText
              primary="Collection Visibility"
              secondary={
                collection.isPublic
                  ? 'Anyone can discover and request to join'
                  : 'Only people you invite can join'
              }
            />
            {(collection.isOwner || collection.isAdmin) && (
              <FormControlLabel
                control={
                  <Switch
                    checked={collection.isPublic}
                    onChange={(e) => handleVisibilityToggle(e.target.checked)}
                    disabled={isTogglingVisibility}
                    color="primary"
                  />
                }
                label=""
                sx={{ ml: 1 }}
              />
            )}
          </ListItem>

          <Divider sx={{ my: 1 }} />

          {/* Member Management */}
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ px: 2, py: 1 }}
          >
            Members
          </Typography>

          <ListItem disablePadding>
            <ListItemButton onClick={handleManageMembersClick}>
              <ListItemIcon>
                <PeopleIcon />
              </ListItemIcon>
              <ListItemText
                primary="Manage Members"
                secondary="View, invite, and remove members"
              />
            </ListItemButton>
          </ListItem>

          {/* Danger Zone - Owner Only */}
          {collection.isOwner && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography
                variant="subtitle2"
                color="error.main"
                sx={{ px: 2, py: 1, fontWeight: 600 }}
              >
                Danger Zone
              </Typography>

              {onArchiveCollection && (
                <ListItem disablePadding>
                  <ListItemButton onClick={onArchiveCollection}>
                    <ListItemIcon>
                      <ArchiveIcon sx={{ color: 'warning.main' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Archive Collection"
                      secondary="Hide from active collections, preserve data"
                      primaryTypographyProps={{ color: 'warning.main' }}
                    />
                  </ListItemButton>
                </ListItem>
              )}

              {onDeleteCollection && (
                <ListItem disablePadding>
                  <ListItemButton onClick={onDeleteCollection}>
                    <ListItemIcon>
                      <DeleteIcon sx={{ color: 'error.main' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary="Delete Collection"
                      secondary="Permanently delete this collection and all its data"
                      primaryTypographyProps={{ color: 'error.main' }}
                    />
                  </ListItemButton>
                </ListItem>
              )}
            </>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
}
