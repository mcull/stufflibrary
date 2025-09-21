'use client';

import {
  Close as CloseIcon,
  Send as SendIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  RemoveCircle as RemoveCircleIcon,
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
  ListItemAvatar,
  Avatar,
  Tabs,
  Tab,
  Divider,
  Tooltip,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface ManageMembersModalProps {
  collectionId: string;
  collectionName: string;
  userRole: 'owner' | 'admin' | 'member' | null;
  open: boolean;
  onClose: () => void;
  onMembershipChanged?: () => void; // Callback to refresh collection data
}

interface Invitation {
  id: string;
  email: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  isExpired: boolean;
  sender?: {
    name: string;
    email: string;
  };
}

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name?: string;
    email?: string;
    image?: string;
  };
}

export function ManageMembersModal({
  collectionId,
  collectionName,
  userRole,
  open,
  onClose,
  onMembershipChanged,
}: ManageMembersModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      // Load invitations and members in parallel
      const [invitationsResponse, membersResponse] = await Promise.all([
        fetch(`/api/collections/${collectionId}/invitations`),
        fetch(`/api/collections/${collectionId}/members`),
      ]);

      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json();
        setInvitations(invitationsData.invitations || []);
      }

      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(membersData.members || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoadingData(false);
    }
  }, [collectionId]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/collections/${collectionId}/invite`, {
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
        loadData(); // Refresh the invitations list
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

  const handleRemoveMember = async (memberId: string, memberName?: string) => {
    if (
      !confirm(
        `Are you sure you want to remove ${memberName || 'this member'} from ${collectionName}?`
      )
    ) {
      return;
    }

    setRemovingMemberId(memberId);
    try {
      const response = await fetch(
        `/api/collections/${collectionId}/members/${memberId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        setSuccess(`Member removed successfully`);
        loadData(); // Refresh the members list
        onMembershipChanged?.(); // Notify parent to refresh collection data
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      setError('Failed to remove member. Please try again.');
    } finally {
      setRemovingMemberId(null);
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'primary';
      case 'admin':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const canRemoveMember = (member: Member) => {
    if (userRole === 'owner') {
      return member.role !== 'owner'; // Owner can remove anyone except other owners
    }
    if (userRole === 'admin') {
      return member.role === 'member'; // Admin can only remove regular members
    }
    return false; // Members can't remove anyone
  };

  const canChangeRole = (member: Member) => {
    // Only owners can change roles; cannot change owners; cannot change yourself
    if (userRole !== 'owner') return false;
    if (member.role === 'owner') return false;
    return true;
  };

  const handleChangeRole = async (
    member: Member,
    newRole: 'admin' | 'member'
  ) => {
    setUpdatingRoleId(member.id);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `/api/collections/${collectionId}/members/${member.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role');
      }
      setSuccess(`Updated ${member.user.name || 'member'} to ${newRole}`);
      await loadData();
      onMembershipChanged?.();
    } catch (e) {
      console.error('Failed to update role:', e);
      setError(e instanceof Error ? e.message : 'Failed to update role');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundColor: brandColors.warmCream,
          minHeight: '600px',
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
            Manage Members - {collectionName}
          </Typography>
          <IconButton onClick={handleClose} disabled={isLoading} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Box sx={{ px: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: brandColors.inkBlue,
            },
          }}
        >
          <Tab
            label={`Members (${members.length})`}
            sx={{
              color: brandColors.charcoal,
              '&.Mui-selected': {
                color: brandColors.inkBlue,
              },
            }}
          />
          <Tab
            label={`Invitations (${invitations.length})`}
            sx={{
              color: brandColors.charcoal,
              '&.Mui-selected': {
                color: brandColors.inkBlue,
              },
            }}
          />
          {(userRole === 'owner' || userRole === 'admin') && (
            <Tab
              label="Invite New"
              sx={{
                color: brandColors.charcoal,
                '&.Mui-selected': {
                  color: brandColors.inkBlue,
                },
              }}
            />
          )}
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 2, minHeight: '400px' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* Members Tab */}
        {activeTab === 0 && (
          <Box>
            <Typography
              variant="h6"
              sx={{ mb: 2, color: brandColors.charcoal }}
            >
              Current Members
            </Typography>

            {loadingData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : members.length > 0 ? (
              <List sx={{ bgcolor: brandColors.white, borderRadius: 2 }}>
                {members.map((member, index) => (
                  <Box key={member.id}>
                    <ListItem
                      sx={{
                        py: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', flex: 1 }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            {...(member.user.image && {
                              src: member.user.image,
                            })}
                          >
                            {member.user.name?.charAt(0).toUpperCase() ||
                              member.user.email?.charAt(0).toUpperCase() ||
                              '?'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 500 }}
                              >
                                {member.user.name || 'Unknown User'}
                              </Typography>
                              <Chip
                                label={member.role}
                                size="small"
                                color={getRoleColor(member.role)}
                                variant="outlined"
                                {...(member.role === 'admin'
                                  ? {
                                      icon: <AdminIcon />,
                                    }
                                  : {})}
                              />
                            </Box>
                          }
                          secondary={
                            <>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                component="span"
                                sx={{ display: 'block' }}
                              >
                                {member.user.email}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                component="span"
                                sx={{ display: 'block' }}
                              >
                                Joined{' '}
                                {new Date(member.joinedAt).toLocaleDateString()}
                              </Typography>
                            </>
                          }
                        />
                      </Box>

                      {/* Role change actions */}
                      {canChangeRole(member) && (
                        <Box sx={{ display: 'flex', gap: 1, mr: 1 }}>
                          {member.role !== 'admin' && (
                            <Button
                              variant="outlined"
                              size="small"
                              disabled={updatingRoleId === member.id}
                              onClick={() => handleChangeRole(member, 'admin')}
                              sx={{ textTransform: 'none' }}
                            >
                              {updatingRoleId === member.id
                                ? 'Updating...'
                                : 'Make admin'}
                            </Button>
                          )}
                          {member.role !== 'member' && (
                            <Button
                              variant="outlined"
                              size="small"
                              disabled={updatingRoleId === member.id}
                              onClick={() => handleChangeRole(member, 'member')}
                              sx={{ textTransform: 'none' }}
                            >
                              {updatingRoleId === member.id
                                ? 'Updating...'
                                : 'Make member'}
                            </Button>
                          )}
                        </Box>
                      )}

                      {/* Remove action */}
                      {canRemoveMember(member) && (
                        <Tooltip
                          title={`Remove ${member.user.name || 'member'}`}
                        >
                          <IconButton
                            onClick={() =>
                              handleRemoveMember(member.id, member.user.name)
                            }
                            disabled={removingMemberId === member.id}
                            size="small"
                            sx={{ color: 'error.main' }}
                          >
                            {removingMemberId === member.id ? (
                              <CircularProgress size={20} />
                            ) : (
                              <RemoveCircleIcon />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                    </ListItem>
                    {index < members.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 4 }}
              >
                No members found
              </Typography>
            )}
          </Box>
        )}

        {/* Invitations Tab */}
        {activeTab === 1 && (
          <Box>
            <Typography
              variant="h6"
              sx={{ mb: 2, color: brandColors.charcoal }}
            >
              Pending Invitations
            </Typography>

            {loadingData ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : invitations.length > 0 ? (
              <List sx={{ bgcolor: brandColors.white, borderRadius: 2 }}>
                {invitations.map((invitation, index) => (
                  <Box key={invitation.id}>
                    <ListItem sx={{ py: 2 }}>
                      <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                      <ListItemText
                        primary={invitation.email}
                        secondary={
                          <>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              component="span"
                              sx={{ display: 'block' }}
                            >
                              {invitation.sentAt
                                ? `Sent ${new Date(invitation.sentAt).toLocaleDateString()}`
                                : `Created ${new Date(invitation.createdAt).toLocaleDateString()}`}
                            </Typography>
                            {invitation.sender && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                component="span"
                                sx={{ display: 'block' }}
                              >
                                Sent by {invitation.sender.name}
                              </Typography>
                            )}
                          </>
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
                    {index < invitations.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 4 }}
              >
                No invitations found
              </Typography>
            )}
          </Box>
        )}

        {/* Invite New Tab */}
        {activeTab === 2 && (userRole === 'owner' || userRole === 'admin') && (
          <form onSubmit={handleInviteSubmit}>
            <Typography
              variant="h6"
              sx={{ mb: 2, color: brandColors.charcoal }}
            >
              Invite New Member
            </Typography>

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
          </form>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
