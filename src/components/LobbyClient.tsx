'use client';

import { Add as AddIcon } from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  CircularProgress,
} from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';

import { useBorrowRequests } from '@/hooks/useBorrowRequests';
import { useBranches } from '@/hooks/useBranches';
import { brandColors } from '@/theme/brandTokens';

import { BranchCreationModal } from './BranchCreationModal';

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
  bio: string | null;
  shareInterests: string[];
  borrowInterests: string[];
  profileCompleted: boolean;
  createdAt: Date;
}

interface LobbyClientProps {
  user: User;
  showWelcome: boolean;
}

export function LobbyClient({ user, showWelcome }: LobbyClientProps) {
  const { branches, isLoading, createBranch } = useBranches();
  const {
    activeBorrows,
    sentRequests,
    isLoading: borrowsLoading,
  } = useBorrowRequests();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateBranch = (branch: unknown) => {
    console.log('Branch created:', branch);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Welcome Message - only after profile creation */}
      {showWelcome && (
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Welcome to Stuff Central, {user.name}!
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
            This is your lending/borrowing hub.
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

      {/* Three Capsule Layout */}
      <Stack spacing={4}>
        {/* Your Stuff Capsule */}
        <Card
          sx={{
            borderRadius: '24px',
            border: `1px solid ${brandColors.softGray}`,
            backgroundColor: brandColors.white,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.1)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: brandColors.charcoal,
                mb: 2,
                textAlign: 'center',
              }}
            >
              Your Stuff
            </Typography>

            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: brandColors.inkBlue,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <Typography variant="h4" sx={{ color: brandColors.white }}>
                  📦
                </Typography>
              </Box>

              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Add items you&apos;re willing to share with your community
              </Typography>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                sx={{
                  borderRadius: 3,
                  px: 3,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Add Items
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Your Libraries Capsule */}
        <Card
          sx={{
            borderRadius: '24px',
            border: `1px solid ${brandColors.softGray}`,
            backgroundColor: brandColors.white,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.1)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: brandColors.charcoal,
                mb: 2,
                textAlign: 'center',
              }}
            >
              Your Libraries
            </Typography>

            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={40} />
              </Box>
            ) : branches.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: brandColors.mustardYellow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <Typography variant="h4" sx={{ color: brandColors.charcoal }}>
                    🏠
                  </Typography>
                </Box>

                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Join or create sharing communities in your neighborhood
                </Typography>

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsCreateModalOpen(true)}
                  sx={{
                    borderRadius: 3,
                    px: 3,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    backgroundColor: brandColors.mustardYellow,
                    color: brandColors.charcoal,
                    '&:hover': {
                      backgroundColor: '#C19E04',
                    },
                  }}
                >
                  Create Library
                </Button>
              </Box>
            ) : (
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: 'center', mb: 2 }}
                >
                  {branches.length}{' '}
                  {branches.length === 1 ? 'library' : 'libraries'}
                </Typography>
                <Stack spacing={2}>
                  {branches.slice(0, 2).map((branch) => (
                    <Box
                      key={branch.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: brandColors.warmCream,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600 }}
                        >
                          {branch.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {branch.memberCount} members
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        component={Link}
                        href={`/branch/${branch.id}`}
                        sx={{ textTransform: 'none' }}
                      >
                        View
                      </Button>
                    </Box>
                  ))}
                  {branches.length > 2 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ textAlign: 'center' }}
                    >
                      +{branches.length - 2} more
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Activity Capsule */}
        <Card
          sx={{
            borderRadius: '24px',
            border: `1px solid ${brandColors.softGray}`,
            backgroundColor: brandColors.white,
            transition: 'all 0.2s ease',
            '&:hover': {
              boxShadow: '0 8px 25px -5px rgba(0, 0, 0, 0.1)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: brandColors.charcoal,
                mb: 2,
                textAlign: 'center',
              }}
            >
              Activity
            </Typography>

            {borrowsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={40} />
              </Box>
            ) : activeBorrows.length === 0 && sentRequests.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: brandColors.tomatoRed,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <Typography variant="h4" sx={{ color: brandColors.white }}>
                    ⚡
                  </Typography>
                </Box>

                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  No recent activity
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your borrowing and lending activity will appear here
                </Typography>
              </Box>
            ) : (
              <Box>
                <Stack spacing={2}>
                  {/* Show active borrows first */}
                  {activeBorrows.slice(0, 2).map((request) => (
                    <Box
                      key={request.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: brandColors.warmCream,
                        borderLeft: `4px solid ${brandColors.inkBlue}`,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {request.item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Borrowed from {request.lender.name}
                      </Typography>
                    </Box>
                  ))}

                  {/* Show pending requests */}
                  {sentRequests
                    .filter((req) => req.status === 'pending')
                    .slice(0, 2)
                    .map((request) => (
                      <Box
                        key={request.id}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: brandColors.warmCream,
                          borderLeft: `4px solid ${brandColors.mustardYellow}`,
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 600 }}
                        >
                          {request.item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Requested from {request.lender.name}
                        </Typography>
                      </Box>
                    ))}

                  {activeBorrows.length +
                    sentRequests.filter((req) => req.status === 'pending')
                      .length >
                    2 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ textAlign: 'center', pt: 1 }}
                    >
                      +
                      {activeBorrows.length +
                        sentRequests.filter((req) => req.status === 'pending')
                          .length -
                        2}{' '}
                      more
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>
      </Stack>

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
