'use client';

import {
  Add as AddIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';

import { useBranches } from '@/hooks/useBranches';
import { brandColors } from '@/theme/brandTokens';

import { BranchCreationModal } from './BranchCreationModal';
import { InvitedBranchesSection } from './InvitedBranchesSection';
import { LibraryCard } from './LibraryCard';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
  bio: string | null;
  interests: string[];
  profileCompleted: boolean;
  createdAt: Date;
}

interface LobbyClientProps {
  user: User;
  showWelcome: boolean;
}

export function LobbyClient({ user, showWelcome }: LobbyClientProps) {
  const { branches, isLoading, error, refetch, createBranch } = useBranches();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Mock data for checked out items (to be replaced with real data later)
  const checkedOutItems = [
    {
      id: 1,
      name: 'Power Drill',
      owner: 'Sarah Chen',
      ownerAvatar: '/api/placeholder/40/40',
      itemImage: '/api/placeholder/80/80',
      dueDate: '2025-01-25',
      isOverdue: false,
    },
    {
      id: 2,
      name: 'Camping Tent (4-person)',
      owner: 'Mike Rodriguez',
      ownerAvatar: '/api/placeholder/40/40',
      itemImage: '/api/placeholder/80/80',
      dueDate: '2025-01-20',
      isOverdue: true,
    },
  ];

  const handleCreateBranch = (branch: unknown) => {
    console.log('Branch created:', branch);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Welcome Message - only after profile creation */}
      {showWelcome && (
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Welcome to your Lobby, {user.name}!
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            Your profile has been successfully created. This is your personal
            lobby.
          </Typography>
        </Box>
      )}

      {/* Regular Header - for returning users */}
      {!showWelcome && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome back, {user.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your community sharing lobby
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 4,
        }}
      >
        {/* Left Column */}
        <Box sx={{ flex: { md: 2 } }}>
          {/* Invited Branches */}
          <InvitedBranchesSection />

          {/* My Branches */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                }}
              >
                <Typography variant="h5" component="h2">
                  My Branches
                </Typography>
                <Button variant="outlined" startIcon={<AddIcon />} size="small">
                  Join Branch
                </Button>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                  <Button onClick={refetch} size="small" sx={{ ml: 1 }}>
                    Retry
                  </Button>
                </Alert>
              )}

              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={40} />
                </Box>
              ) : branches.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    gutterBottom
                  >
                    You haven&apos;t joined any branches yet
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    Create your first branch or join an existing community
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Create Your First Branch
                  </Button>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {branches.map((branch) => (
                    <Card key={branch.id} variant="outlined">
                      <CardContent sx={{ py: 2 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Box>
                            <Typography variant="h6" component="h3">
                              {branch.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {branch.memberCount} members
                            </Typography>
                            {branch.location && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                📍 {branch.location}
                              </Typography>
                            )}
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Chip
                              label={branch.role}
                              size="small"
                              color={
                                branch.role === 'owner' ? 'primary' : 'default'
                              }
                            />
                            <Button
                              size="small"
                              variant="text"
                              component={Link}
                              href={`/branch/${branch.id}`}
                            >
                              View
                            </Button>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Open a Branch */}
          <Card sx={{ mb: 4, bgcolor: brandColors.warmCream }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                Start Your Own Branch
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Create a sharing community in your neighborhood
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => setIsCreateModalOpen(true)}
                sx={{
                  bgcolor: brandColors.inkBlue,
                  '&:hover': { bgcolor: '#1a2f4f' },
                }}
              >
                Open a Branch
              </Button>
            </CardContent>
          </Card>

          {/* Items I Have Checked Out */}
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
                Items I Have Checked Out
              </Typography>
              {checkedOutItems.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No items currently checked out
                  </Typography>
                  <Button variant="outlined" sx={{ mt: 2 }}>
                    Browse Items
                  </Button>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {checkedOutItems.map((item) => (
                    <Card
                      key={item.id}
                      variant="outlined"
                      sx={{
                        ...(item.isOverdue && {
                          border: `2px solid ${brandColors.tomatoRed}`,
                        }),
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          {/* Item Image Placeholder */}
                          <Box
                            sx={{
                              width: 80,
                              height: 80,
                              bgcolor: 'grey.200',
                              borderRadius: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              IMG
                            </Typography>
                          </Box>

                          {/* Item Details */}
                          <Box sx={{ flex: 1 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                mb: 1,
                              }}
                            >
                              <Typography variant="h6" component="h3">
                                {item.name}
                              </Typography>
                              {item.isOverdue && (
                                <Chip
                                  icon={<WarningIcon />}
                                  label="Overdue"
                                  color="error"
                                  size="small"
                                />
                              )}
                            </Box>

                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 2,
                              }}
                            >
                              <Avatar sx={{ width: 24, height: 24 }}>
                                <PersonIcon />
                              </Avatar>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {item.owner}
                              </Typography>
                            </Box>

                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 2,
                              }}
                            >
                              <TimeIcon
                                sx={{
                                  width: 20,
                                  height: 20,
                                  color: 'text.secondary',
                                }}
                              />
                              <Typography
                                variant="body2"
                                color={
                                  item.isOverdue ? 'error' : 'text.secondary'
                                }
                              >
                                Due:{' '}
                                {new Date(item.dueDate).toLocaleDateString()}
                              </Typography>
                            </Box>

                            {/* Actions */}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                startIcon={<ScheduleIcon />}
                                variant="outlined"
                              >
                                Ask for More Time
                              </Button>
                              <Button
                                size="small"
                                startIcon={<WarningIcon />}
                                variant="outlined"
                                color="warning"
                              >
                                Report Problem
                              </Button>
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Right Column - Library Card */}
        <Box sx={{ flex: { md: 1 } }}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography
                variant="h6"
                component="h2"
                gutterBottom
                sx={{ textAlign: 'center' }}
              >
                Your Library Card
              </Typography>
              <Box sx={{ mb: 3 }}>
                <LibraryCard
                  user={{
                    ...user,
                    name: user.name || '',
                    email: user.email || '',
                    image: user.image ?? undefined,
                    createdAt: user.createdAt.toISOString(),
                  }}
                />
              </Box>

              {/* User Info Summary */}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </Typography>
                {user.interests.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Interests
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.5,
                        justifyContent: 'center',
                      }}
                    >
                      {user.interests.slice(0, 3).map((interest) => (
                        <Chip
                          key={interest}
                          label={interest}
                          size="small"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                      {user.interests.length > 3 && (
                        <Chip
                          label={`+${user.interests.length - 3} more`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Branch Creation Modal */}
      <BranchCreationModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateBranch}
        createBranch={createBranch}
      />
    </Container>
  );
}
