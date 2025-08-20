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
} from '@mui/material';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { LibraryCard } from '@/components/LibraryCard';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { brandColors } from '@/theme/brandTokens';

interface LobbyPageProps {
  searchParams: Promise<{ welcome?: string }>;
}

export default async function LobbyPage({ searchParams }: LobbyPageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Try different ways to get user ID
  const userId =
    (session.user as any).id ||
    (session as any).user?.id ||
    (session as any).userId;

  // Find user by ID or email
  let user;
  if (userId) {
    user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        interests: true,
        profileCompleted: true,
        createdAt: true,
      },
    });
  } else if (session.user?.email) {
    user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        interests: true,
        profileCompleted: true,
        createdAt: true,
      },
    });
  }

  if (!user) {
    redirect('/auth/signin');
  }

  // If profile is not completed, redirect to profile creation
  if (!user.profileCompleted) {
    redirect('/profile/create');
  }

  // Show welcome message only when redirected from profile creation
  const showWelcome = params.welcome === 'true';

  // Mock data for demo - these would come from your database
  const myBranches = [
    { id: 1, name: 'Sunset District', memberCount: 124, role: 'member' },
    { id: 2, name: 'Mission Bay', memberCount: 89, role: 'organizer' },
  ];

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
              <Stack spacing={2}>
                {myBranches.map((branch) => (
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
                        </Box>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <Chip
                            label={branch.role}
                            size="small"
                            color={
                              branch.role === 'organizer'
                                ? 'primary'
                                : 'default'
                            }
                          />
                          <Button size="small" variant="text">
                            View
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
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
    </Container>
  );
}
