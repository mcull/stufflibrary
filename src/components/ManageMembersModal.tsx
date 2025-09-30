'use client';

import {
  Close as CloseIcon,
  Send as SendIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  RemoveCircle as RemoveCircleIcon,
  Construction as ConstructionIcon,
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
  Tabs,
  Tab,
  Divider,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
  initialTab?: 0 | 1; // 0=Members, 1=+Add
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
    addresses?: Array<{
      address1?: string;
      city?: string;
      state?: string;
      zip?: string;
      formattedAddress?: string;
    }>;
  };
}

export function ManageMembersModal({
  collectionId,
  collectionName,
  userRole,
  open,
  onClose,
  onMembershipChanged,
  initialTab = 0,
}: ManageMembersModalProps) {
  console.log('[ManageMembersModal] props', {
    collectionId,
    collectionName,
    userRole,
    open,
    initialTab,
  });
  const [activeTab, setActiveTab] = useState(initialTab);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [_updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [_transferringOwnerId, setTransferringOwnerId] = useState<
    string | null
  >(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [limitPerHour, setLimitPerHour] = useState<number>(0);

  const copyText = useCallback(async (text: string) => {
    console.log('[ManageMembersModal] copyText attempt', {
      textLength: text?.length,
    });
    try {
      // Try modern clipboard API first
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        console.log('[ManageMembersModal] clipboard API success');
        return true;
      }

      // Fallback for browsers without clipboard API
      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      // Make it visible but off-screen for iOS
      textarea.style.position = 'fixed';
      textarea.style.left = '0';
      textarea.style.top = '0';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);

      // Focus and select the text
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      // Try to copy
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);

      console.log('[ManageMembersModal] fallback copy result', { success });
      return success;
    } catch (error) {
      console.error('[ManageMembersModal] copy failed', error);
      return false;
    }
  }, []);

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
    console.log('[ManageMembersModal] open effect', { open, collectionId });
    if (open) {
      // Sync the active tab with the requested initial tab when opening
      setActiveTab(initialTab);
      loadData();
      fetch(`/api/collections/${collectionId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.collection?.inviteRateLimitPerHour != null) {
            setLimitPerHour(Number(data.collection.inviteRateLimitPerHour));
            console.log('[ManageMembersModal] loaded limit', {
              limit: Number(data.collection.inviteRateLimitPerHour),
            });
          }
        })
        .catch((e) => {
          console.log('[ManageMembersModal] failed to load limit', e);
        });
    }
  }, [open, initialTab, loadData]);

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

  //
  const handleTransferOwnership = async (member: Member) => {
    if (!confirm(`Transfer ownership to ${member.user.name || 'this member'}?`))
      return;
    setTransferringOwnerId(member.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/collections/${collectionId}/transfer-ownership`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newOwnerId: member.user.id }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || 'Failed to transfer ownership');
      setSuccess('Ownership transferred');
      await loadData();
      onMembershipChanged?.();
    } catch (e) {
      console.error('Failed to transfer ownership:', e);
      setError(e instanceof Error ? e.message : 'Failed to transfer ownership');
    } finally {
      setTransferringOwnerId(null);
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

  // Role color helper removed

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
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: brandColors.inkBlue,
            },
            // Ensure tabs don't get cut off on small screens
            overflowX: 'auto',
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
          {(userRole === 'owner' || userRole === 'admin') && (
            <Tab
              label={'+Add'}
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
                      <Box sx={{ flex: 1 }}>
                        <ListItemText
                          primary={
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 500 }}
                            >
                              {member.user.name || 'Unknown User'}
                            </Typography>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
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
                              {(() => {
                                const addr = member.user.addresses?.[0];
                                const text =
                                  addr?.formattedAddress ||
                                  (addr?.address1 && addr?.city && addr?.state
                                    ? `${addr.address1}, ${addr.city}, ${addr.state} ${addr.zip || ''}`.trim()
                                    : null);
                                return text ? (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    component="span"
                                    sx={{ display: 'block' }}
                                  >
                                    {text}
                                  </Typography>
                                ) : null;
                              })()}
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                component="span"
                                sx={{ display: 'block' }}
                              >
                                Joined{' '}
                                {new Date(member.joinedAt).toLocaleDateString()}
                              </Typography>
                              <Box
                                sx={{
                                  mt: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  flexWrap: 'wrap',
                                }}
                              >
                                {canChangeRole(member) ? (
                                  <FormControl
                                    size="medium"
                                    sx={{ minWidth: { xs: 160, sm: 180 } }}
                                  >
                                    <InputLabel id={`role-label-${member.id}`}>
                                      Role
                                    </InputLabel>
                                    <Select
                                      labelId={`role-label-${member.id}`}
                                      label="Role"
                                      value={member.role}
                                      onChange={(e) => {
                                        const role = e.target.value as
                                          | 'owner'
                                          | 'admin'
                                          | 'member';
                                        if (role === 'owner') {
                                          handleTransferOwnership(member);
                                        } else if (
                                          role === 'admin' ||
                                          role === 'member'
                                        ) {
                                          handleChangeRole(member, role);
                                        }
                                      }}
                                      sx={{
                                        '& .MuiSelect-select': {
                                          py: 1.25,
                                          pr: 5,
                                        },
                                      }}
                                    >
                                      <MenuItem value="member">Member</MenuItem>
                                      <MenuItem value="admin">Admin</MenuItem>
                                      <MenuItem value="owner">Owner</MenuItem>
                                    </Select>
                                  </FormControl>
                                ) : (
                                  <>
                                    {member.role === 'owner' ? (
                                      <Chip
                                        icon={
                                          <ConstructionIcon
                                            sx={{ fontSize: 16 }}
                                          />
                                        }
                                        label="Owner"
                                        size="small"
                                        sx={{
                                          backgroundColor: '#E8F5E8',
                                          color: '#2E7D32',
                                          height: 22,
                                          '& .MuiChip-icon': {
                                            color: '#2E7D32',
                                          },
                                        }}
                                      />
                                    ) : member.role === 'admin' ? (
                                      <Chip
                                        icon={
                                          <AdminIcon sx={{ fontSize: 16 }} />
                                        }
                                        label="Admin"
                                        size="small"
                                        sx={{
                                          backgroundColor: '#E3F2FD',
                                          color: '#1565C0',
                                          height: 22,
                                          '& .MuiChip-icon': {
                                            color: '#1565C0',
                                          },
                                        }}
                                      />
                                    ) : (
                                      <Chip
                                        label="Member"
                                        size="small"
                                        variant="outlined"
                                        sx={{ height: 22 }}
                                      />
                                    )}
                                  </>
                                )}
                              </Box>
                            </>
                          }
                        />
                      </Box>

                      {/* Role actions moved into dropdown; owner transfer handled on selecting 'Owner' */}

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

        {/* +Add Tab (combined invite form + pending list) */}
        {activeTab === 1 && (userRole === 'owner' || userRole === 'admin') && (
          <Box component="section">
            <Box
              sx={{
                p: 2,
                bgcolor: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16,185,129,0.25)',
                borderRadius: 1,
                mb: 3,
              }}
            >
              <Typography sx={{ fontWeight: 600, mb: 1, color: '#065f46' }}>
                Prefer to share yourself?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Generate a magic join link and share via text, email, or any
                app.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="small"
                  disabled={shareLoading}
                  onClick={async () => {
                    try {
                      setShareLoading(true);
                      setError(null);
                      setSuccess(null);
                      console.log(
                        '[ManageMembersModal] Copy Join Link clicked'
                      );
                      const res = await fetch(
                        `/api/collections/${collectionId}/invite`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ mode: 'link' }),
                        }
                      );
                      const data = await res.json();
                      console.log('[ManageMembersModal] invite API response', {
                        ok: res.ok,
                        hasLink: !!data?.link,
                        linkLength: data?.link?.length,
                      });

                      const link: string | undefined = data?.link;
                      if (!res.ok) {
                        throw new Error(
                          data?.error || `Server error: ${res.status}`
                        );
                      }
                      if (!link) {
                        throw new Error('No link received from server');
                      }

                      // On mobile, prefer native share over clipboard (more reliable on iOS)
                      if (
                        typeof navigator !== 'undefined' &&
                        (navigator as any).share &&
                        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                      ) {
                        console.log(
                          '[ManageMembersModal] using navigator.share on mobile'
                        );
                        await (navigator as any).share({
                          title: `Join ${collectionName} on StuffLibrary`,
                          text: `Here's your invite to ${collectionName}`,
                          url: link,
                        });
                        // Don't set success message for share, as the action is self-evident
                      } else {
                        // Desktop: use clipboard
                        const copySuccess = await copyText(link);
                        if (copySuccess) {
                          setSuccess(
                            'Join link copied to clipboard! Share it with friends.'
                          );
                        } else {
                          // If copy failed, still show the link so user can manually copy
                          setSuccess(
                            `Copy failed, but here's the link: ${link}`
                          );
                        }
                      }
                    } catch (e) {
                      console.error('[ManageMembersModal] copy link failed', e);
                      // Only show error if it's not user cancellation of share dialog
                      if (
                        !(e instanceof Error && e.name === 'AbortError') &&
                        !(e instanceof DOMException && e.name === 'AbortError')
                      ) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : 'Failed to create or share link'
                        );
                      }
                    } finally {
                      setShareLoading(false);
                    }
                  }}
                >
                  {shareLoading ? 'Preparing…' : 'Copy Join Link'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={async () => {
                    try {
                      setShareLoading(true);
                      console.log('[ManageMembersModal] Share… clicked');
                      const res = await fetch(
                        `/api/collections/${collectionId}/invite`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ mode: 'link' }),
                        }
                      );
                      const data = await res.json();
                      const link: string | undefined = data?.link;
                      if (!res.ok || !link)
                        throw new Error(data?.error || 'Failed to create link');
                      if (
                        typeof navigator !== 'undefined' &&
                        (navigator as any).share
                      ) {
                        console.log(
                          '[ManageMembersModal] using navigator.share'
                        );
                        await (navigator as any).share({
                          title: `Join ${collectionName} on StuffLibrary`,
                          text: `Here’s your invite to ${collectionName}`,
                          url: link,
                        });
                      } else {
                        console.log(
                          '[ManageMembersModal] navigator.share unavailable, copying'
                        );
                        const ok = await copyText(link);
                        setSuccess(
                          ok
                            ? 'Share link copied to clipboard'
                            : `Join link: ${link}`
                        );
                      }
                    } catch (e) {
                      console.log('[ManageMembersModal] share failed', e);
                      setError(
                        e instanceof Error ? e.message : 'Failed to share link'
                      );
                    } finally {
                      setShareLoading(false);
                    }
                  }}
                >
                  Share…
                </Button>
              </Box>
            </Box>
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
                  {limitPerHour === 0
                    ? '💡 Invites are unlimited. Invitations expire after 7 days.'
                    : `💡 You can send up to ${limitPerHour} invitations per hour. Invitations expire after 7 days.`}
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

            <Box sx={{ mt: 4 }}>
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
                          secondaryTypographyProps={{ component: 'div' }}
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
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
