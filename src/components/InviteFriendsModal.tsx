'use client';

import {
  Close as CloseIcon,
  Send as SendIcon,
  Email as EmailIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
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
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface InviteFriendsModalProps {
  libraryId: string;
  libraryName: string;
  open: boolean;
  onClose: () => void;
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  isExpired: boolean;
}

export function InviteFriendsModal({
  libraryId,
  libraryName,
  open,
  onClose,
}: InviteFriendsModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  const loadInvitations = useCallback(async () => {
    setLoadingInvitations(true);
    try {
      const response = await fetch(`/api/libraries/${libraryId}/invitations`);
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (_error) {
      console.error('Failed to load invitations:', _error);
    } finally {
      setLoadingInvitations(false);
    }
  }, [libraryId]);

  // Load existing invitations when modal opens
  useEffect(() => {
    if (open) {
      loadInvitations();
    }
  }, [open, libraryId, loadInvitations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/libraries/${libraryId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Invitation sent to ${email}`);
        setEmail('');
        loadInvitations(); // Refresh the list
      } else {
        setError(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  const getStatusColor = (status: string, isExpired: boolean) => {
    if (isExpired) return 'error';
    switch (status) {
      case 'SENT':
        return 'success';
      case 'ACCEPTED':
        return 'primary';
      case 'PENDING':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string, isExpired: boolean) => {
    if (isExpired) return 'Expired';
    switch (status) {
      case 'SENT':
        return 'Sent';
      case 'ACCEPTED':
        return 'Accepted';
      case 'PENDING':
        return 'Pending';
      default:
        return status;
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
            Invite Friends to {libraryName}
          </Typography>
          <IconButton onClick={handleClose} disabled={isLoading} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Send email invitations to friends you&apos;d like to share items with
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Friend's Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              required
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: brandColors.white,
                },
              }}
            />
          </Box>

          {/* Rate limiting notice */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: 1,
              mb: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              💡 You can send up to 5 invitations per hour. Invitations expire
              after 7 days.
            </Typography>
          </Box>

          {/* Existing Invitations */}
          <Box>
            <Typography
              variant="h6"
              sx={{ mb: 2, color: brandColors.charcoal }}
            >
              Recent Invitations
            </Typography>

            {loadingInvitations ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : invitations.length > 0 ? (
              <List sx={{ bgcolor: brandColors.white, borderRadius: 1 }}>
                {invitations.slice(0, 5).map((invitation, index) => (
                  <Box key={invitation.id}>
                    <ListItem sx={{ py: 1.5 }}>
                      <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                      <ListItemText
                        primary={invitation.email}
                        secondary={
                          invitation.sentAt
                            ? `Sent ${new Date(invitation.sentAt).toLocaleDateString()}`
                            : `Created ${new Date(invitation.createdAt).toLocaleDateString()}`
                        }
                      />
                      <Chip
                        label={getStatusText(
                          invitation.status,
                          invitation.isExpired
                        )}
                        size="small"
                        color={getStatusColor(
                          invitation.status,
                          invitation.isExpired
                        )}
                        variant={
                          invitation.status === 'ACCEPTED'
                            ? 'filled'
                            : 'outlined'
                        }
                      />
                    </ListItem>
                    {index < Math.min(invitations.length, 5) - 1 && <Divider />}
                  </Box>
                ))}
                {invitations.length > 5 && (
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textAlign: 'center' }}
                        >
                          +{invitations.length - 5} more invitations
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 2 }}
              >
                No invitations sent yet
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || !email.trim()}
            startIcon={
              isLoading ? <CircularProgress size={16} /> : <SendIcon />
            }
            sx={{
              bgcolor: brandColors.inkBlue,
              '&:hover': { bgcolor: '#1a2f4f' },
              '&:disabled': { bgcolor: 'grey.300' },
            }}
          >
            {isLoading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
