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
import { useUserItems } from '@/hooks/useUserItems';
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
  const {
    readyToLendCount,
    onLoanCount,
    borrowedCount,
    isLoading: itemsLoading,
  } = useUserItems();
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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: brandColors.charcoal,
                }}
              >
                Your Stuff
              </Typography>
              <Button
                variant="text"
                size="small"
                sx={{
                  textTransform: 'none',
                  color: brandColors.inkBlue,
                  fontSize: '0.875rem',
                }}
              >
                View All →
              </Button>
            </Box>

            {itemsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={40} />
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
                  gap: 3,
                }}
              >
                {/* Ready to Lend */}
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    backgroundColor: brandColors.warmCream,
                    border: `1px solid ${brandColors.softGray}`,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#F5F1E8',
                      transform: 'translateY(-1px)',
                    },
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Ready to Lend
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: brandColors.inkBlue,
                      mb: 1,
                    }}
                  >
                    {readyToLendCount}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {readyToLendCount === 1
                      ? 'item available'
                      : 'items available'}
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      backgroundColor: brandColors.inkBlue,
                      '&:hover': {
                        backgroundColor: '#1a2f4f',
                      },
                    }}
                  >
                    Add Items
                  </Button>
                </Box>

                {/* On Loan */}
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    backgroundColor: brandColors.warmCream,
                    border: `1px solid ${brandColors.softGray}`,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#F5F1E8',
                      transform: 'translateY(-1px)',
                    },
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    On Loan
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: brandColors.mustardYellow,
                      mb: 1,
                    }}
                  >
                    {onLoanCount}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {onLoanCount === 1 ? 'item lent out' : 'items lent out'}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      borderColor: brandColors.charcoal,
                      color: brandColors.charcoal,
                      opacity: onLoanCount > 0 ? 1 : 0.5,
                      '&:hover': {
                        backgroundColor: brandColors.charcoal,
                        color: brandColors.white,
                      },
                    }}
                    disabled={onLoanCount === 0}
                  >
                    View Status
                  </Button>
                </Box>

                {/* Stuff I've Borrowed */}
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    backgroundColor: brandColors.warmCream,
                    border: `1px solid ${brandColors.softGray}`,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#F5F1E8',
                      transform: 'translateY(-1px)',
                    },
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Stuff I&apos;ve Borrowed
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: brandColors.tomatoRed,
                      mb: 1,
                    }}
                  >
                    {borrowedCount}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {borrowedCount === 1 ? 'item borrowed' : 'items borrowed'}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      borderColor: brandColors.tomatoRed,
                      color: brandColors.tomatoRed,
                      opacity: borrowedCount > 0 ? 1 : 0.5,
                      '&:hover': {
                        backgroundColor: brandColors.tomatoRed,
                        color: brandColors.white,
                      },
                    }}
                    disabled={borrowedCount === 0}
                  >
                    View & Return
                  </Button>
                </Box>
              </Box>
            )}
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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: brandColors.charcoal,
                }}
              >
                Your Libraries
              </Typography>
              {branches.length > 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setIsCreateModalOpen(true)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    borderColor: brandColors.mustardYellow,
                    color: brandColors.charcoal,
                    '&:hover': {
                      backgroundColor: brandColors.mustardYellow,
                      borderColor: brandColors.mustardYellow,
                    },
                  }}
                >
                  New
                </Button>
              )}
            </Box>

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
                  Collections of stuff shared among friends and neighbors.
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
                  sx={{ textAlign: 'center', mb: 3 }}
                >
                  You&apos;re a member of {branches.length}{' '}
                  {branches.length === 1 ? 'library' : 'libraries'}
                </Typography>
                <Stack spacing={3}>
                  {branches.slice(0, 3).map((branch) => (
                    <Box
                      key={branch.id}
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        backgroundColor: brandColors.warmCream,
                        border: `1px solid ${brandColors.softGray}`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          transform: 'translateY(-1px)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 2,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600, mb: 0.5 }}
                          >
                            {branch.name}
                          </Typography>
                          {branch.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1 }}
                            >
                              {branch.description.length > 80
                                ? `${branch.description.substring(0, 80)}...`
                                : branch.description}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {branch.memberCount} members
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {branch.itemCount} items
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color:
                                  branch.role === 'owner'
                                    ? brandColors.inkBlue
                                    : 'text.secondary',
                                fontWeight: branch.role === 'owner' ? 600 : 400,
                              }}
                            >
                              {branch.role === 'owner'
                                ? '👑 Owner'
                                : `${branch.role}`}
                            </Typography>
                          </Stack>
                        </Box>
                        <Button
                          size="small"
                          component={Link}
                          href={`/branch/${branch.id}`}
                          sx={{
                            textTransform: 'none',
                            borderRadius: 2,
                            px: 2,
                            backgroundColor: brandColors.white,
                            '&:hover': {
                              backgroundColor: brandColors.inkBlue,
                              color: brandColors.white,
                            },
                          }}
                        >
                          View
                        </Button>
                      </Box>
                      {branch.location && (
                        <Typography variant="caption" color="text.secondary">
                          📍 {branch.location}
                        </Typography>
                      )}
                    </Box>
                  ))}
                  {branches.length > 3 && (
                    <Button
                      variant="text"
                      size="small"
                      sx={{
                        textTransform: 'none',
                        color: brandColors.inkBlue,
                        fontSize: '0.875rem',
                      }}
                    >
                      View all {branches.length} libraries →
                    </Button>
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
