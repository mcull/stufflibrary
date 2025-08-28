'use client';

import {
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Avatar,
  Chip,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect } from 'react';

import { brandColors } from '@/theme/brandTokens';

interface InvitedBranch {
  id: string;
  token: string;
  branch: {
    id: string;
    name: string;
    location?: string;
    owner: {
      name: string;
    };
    memberCount: number;
  };
  invitedBy: {
    name: string;
  };
  createdAt: string;
  expiresAt: string;
}

export function InvitedBranchesSection() {
  const [invitations, setInvitations] = useState<InvitedBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningBranch, setJoiningBranch] = useState<string | null>(null);

  useEffect(() => {
    loadPendingInvitations();
  }, []);

  const loadPendingInvitations = async () => {
    try {
      const response = await fetch('/api/invitations/pending');
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      } else {
        setError('Failed to load invitations');
      }
    } catch (error) {
      console.error('Failed to load invitations:', error);
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinBranch = async (token: string, _branchName: string) => {
    setJoiningBranch(token);
    setError(null);

    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Remove the accepted invitation from the list
        setInvitations((prev) => prev.filter((inv) => inv.token !== token));

        // Redirect to the branch page with welcome banner
        const redirectUrl = new URL(
          `/library/${data.branch.id}`,
          window.location.origin
        );
        redirectUrl.searchParams.set('message', 'joined_successfully');
        if (data.user?.firstName) {
          redirectUrl.searchParams.set('welcomeName', data.user.firstName);
        }
        window.location.href = redirectUrl.toString();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to join branch');
      }
    } catch (error) {
      console.error('Failed to join branch:', error);
      setError('Failed to join branch');
    } finally {
      setJoiningBranch(null);
    }
  };

  if (loading) {
    return (
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't show section if no invitations
  }

  return (
    <Card sx={{ mb: 4, bgcolor: '#fef3c7' }}>
      <CardContent>
        <Typography
          variant="h5"
          component="h2"
          sx={{ mb: 3, color: brandColors.charcoal }}
        >
          Branch Invitations
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          {invitations.map((invitation) => (
            <Card
              key={invitation.id}
              variant="outlined"
              sx={{ bgcolor: brandColors.white }}
            >
              <CardContent sx={{ py: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                      {invitation.branch.name}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Avatar sx={{ width: 20, height: 20 }}>
                        <PersonIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                      <Typography variant="body2" color="text.secondary">
                        Invited by {invitation.invitedBy.name}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 2,
                      }}
                    >
                      {invitation.branch.location && (
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <LocationIcon
                            sx={{ fontSize: 16, color: 'text.secondary' }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {invitation.branch.location}
                          </Typography>
                        </Box>
                      )}

                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        <GroupIcon
                          sx={{ fontSize: 16, color: 'text.secondary' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {invitation.branch.memberCount} member
                          {invitation.branch.memberCount !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={`Expires ${new Date(invitation.expiresAt).toLocaleDateString()}`}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() =>
                        handleJoinBranch(
                          invitation.token,
                          invitation.branch.name
                        )
                      }
                      disabled={joiningBranch === invitation.token}
                      sx={{
                        bgcolor: brandColors.inkBlue,
                        '&:hover': { bgcolor: '#1a2f4f' },
                        '&:disabled': { bgcolor: 'grey.300' },
                        minWidth: 80,
                      }}
                    >
                      {joiningBranch === invitation.token ? (
                        <CircularProgress size={16} />
                      ) : (
                        'Join'
                      )}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
