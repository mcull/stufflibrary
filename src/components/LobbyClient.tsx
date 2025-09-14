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
  Chip,
} from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';

import { useBorrowRequests } from '@/hooks/useBorrowRequests';
import { useLibraries } from '@/hooks/useLibraries';
import { useUserItems } from '@/hooks/useUserItems';
import { brandColors, spacing } from '@/theme/brandTokens';

import { LibraryCreationModal } from './LibraryCreationModal';
import { TabbedFolderPane, type TabItem } from './TabbedFolderPane';
import { UserItemCard, AddItemCard } from './UserItemCard';

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

type FilterType = 'all' | 'ready-to-lend' | 'on-loan' | 'offline' | 'borrowed';

export function LobbyClient({ user, showWelcome }: LobbyClientProps) {
  const { libraries, isLoading, createLibrary } = useLibraries();
  const {
    activeBorrows: _activeBorrows,
    sentRequests: _sentRequests,
    isLoading: _borrowsLoading,
  } = useBorrowRequests();
  const {
    readyToLendItems,
    onLoanItems,
    offlineItems,
    borrowedItems,
    readyToLendCount,
    onLoanCount,
    offlineCount,
    borrowedCount,
    isLoading: itemsLoading,
  } = useUserItems();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('others-stuff');
  const [itemFilter, setItemFilter] = useState<FilterType>('all');

  const handleCreateLibrary = (library: unknown) => {
    console.log('Library created:', library);
  };

  // Combine all items with their status
  const allItems = [
    ...readyToLendItems.map((item) => ({
      ...item,
      status: 'ready-to-lend' as const,
    })),
    ...onLoanItems.map((item) => ({ ...item, status: 'on-loan' as const })),
    ...offlineItems.map((item) => ({ ...item, status: 'offline' as const })),
    ...borrowedItems.map((item) => ({ ...item, status: 'borrowed' as const })),
  ];

  const filteredItems =
    itemFilter === 'all'
      ? allItems
      : allItems.filter((item) => item.status === itemFilter);

  // Your Shelf Tab Content
  const yourStuffContent = (
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
        {itemsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={40} />
          </Box>
        ) : (
          <>
            {/* Filter Chips */}
            <Box sx={{ mb: 3 }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ flexWrap: 'wrap', gap: 1 }}
              >
                <Chip
                  label={`All (${allItems.length})`}
                  onClick={() => setItemFilter('all')}
                  sx={{
                    backgroundColor:
                      itemFilter === 'all' ? brandColors.inkBlue : '#E8F5E8',
                    color: itemFilter === 'all' ? brandColors.white : '#2E7D32',
                    fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor:
                        itemFilter === 'all' ? '#1a2f4f' : brandColors.inkBlue,
                      color: brandColors.white,
                    },
                  }}
                />
                <Chip
                  label={`Ready to Lend (${readyToLendCount})`}
                  onClick={() => setItemFilter('ready-to-lend')}
                  sx={{
                    backgroundColor:
                      itemFilter === 'ready-to-lend'
                        ? brandColors.inkBlue
                        : '#E8F5E8',
                    color:
                      itemFilter === 'ready-to-lend'
                        ? brandColors.white
                        : '#2E7D32',
                    fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor:
                        itemFilter === 'ready-to-lend'
                          ? '#1a2f4f'
                          : brandColors.inkBlue,
                      color: brandColors.white,
                    },
                  }}
                />
                <Chip
                  label={`On Loan (${onLoanCount})`}
                  onClick={() => setItemFilter('on-loan')}
                  sx={{
                    backgroundColor:
                      itemFilter === 'on-loan'
                        ? brandColors.inkBlue
                        : '#E8F5E8',
                    color:
                      itemFilter === 'on-loan' ? brandColors.white : '#2E7D32',
                    fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor:
                        itemFilter === 'on-loan'
                          ? '#1a2f4f'
                          : brandColors.inkBlue,
                      color: brandColors.white,
                    },
                  }}
                />
                {offlineCount > 0 && (
                  <Chip
                    label={`Offline (${offlineCount})`}
                    onClick={() => setItemFilter('offline')}
                    sx={{
                      backgroundColor:
                        itemFilter === 'offline'
                          ? brandColors.inkBlue
                          : '#E8F5E8',
                      color:
                        itemFilter === 'offline'
                          ? brandColors.white
                          : '#2E7D32',
                      fontWeight: 600,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor:
                          itemFilter === 'offline'
                            ? '#1a2f4f'
                            : brandColors.inkBlue,
                        color: brandColors.white,
                      },
                    }}
                  />
                )}
                <Chip
                  label={`Borrowed (${borrowedCount})`}
                  onClick={() => setItemFilter('borrowed')}
                  sx={{
                    backgroundColor:
                      itemFilter === 'borrowed'
                        ? brandColors.inkBlue
                        : '#E8F5E8',
                    color:
                      itemFilter === 'borrowed' ? brandColors.white : '#2E7D32',
                    fontWeight: 600,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor:
                        itemFilter === 'borrowed'
                          ? '#1a2f4f'
                          : brandColors.inkBlue,
                      color: brandColors.white,
                    },
                  }}
                />
              </Stack>
            </Box>

            {/* Items Grid */}
            {allItems.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: brandColors.warmCream,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <Typography variant="h4" sx={{ color: brandColors.charcoal }}>
                    📚
                  </Typography>
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Your shelf is empty
                </Typography>

                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}
                >
                  Add your first item to start sharing with your community!
                </Typography>

                <Button
                  component={Link}
                  href="/add-item"
                  variant="contained"
                  startIcon={<AddIcon />}
                  sx={{
                    borderRadius: 3,
                    px: 3,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    backgroundColor: brandColors.inkBlue,
                    '&:hover': {
                      backgroundColor: '#1a2f4f',
                    },
                  }}
                >
                  Add Your First Item
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)', // 2 cards on mobile
                    sm: 'repeat(3, 1fr)', // 3 cards on small tablets
                    md: 'repeat(4, 1fr)', // 4 cards on medium screens
                    lg: 'repeat(5, 1fr)', // 5 cards on large screens
                    xl: 'repeat(6, 1fr)', // 6 cards on extra large screens
                  },
                  gap: spacing.md / 16,
                }}
              >
                {itemFilter === 'all' && <AddItemCard />}
                {filteredItems.map((item) => (
                  <UserItemCard
                    key={`${item.status}-${item.id}`}
                    item={item}
                    status={item.status}
                  />
                ))}
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  // Your Libraries Tab Content
  const yourLibrariesContent = (
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
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={40} />
          </Box>
        ) : libraries.length === 0 ? (
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

            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
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
              You&apos;re a member of {libraries.length}{' '}
              {libraries.length === 1 ? 'library' : 'libraries'}
            </Typography>
            <Stack spacing={3}>
              {libraries.slice(0, 3).map((library) => (
                <Box
                  key={library.id}
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
                        {library.name}
                      </Typography>
                      {library.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          {library.description.length > 80
                            ? `${library.description.substring(0, 80)}...`
                            : library.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {library.memberCount} members
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {library.itemCount} items
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color:
                              library.role === 'owner'
                                ? brandColors.inkBlue
                                : 'text.secondary',
                            fontWeight: library.role === 'owner' ? 600 : 400,
                          }}
                        >
                          {library.role === 'owner'
                            ? '👑 Owner'
                            : `${library.role}`}
                        </Typography>
                      </Stack>
                    </Box>
                    <Button
                      size="small"
                      component={Link}
                      href={`/library/${library.id}`}
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
                  {library.location && (
                    <Typography variant="caption" color="text.secondary">
                      📍 {library.location}
                    </Typography>
                  )}
                </Box>
              ))}
              {libraries.length > 3 && (
                <Button
                  variant="text"
                  size="small"
                  sx={{
                    textTransform: 'none',
                    color: brandColors.inkBlue,
                    fontSize: '0.875rem',
                  }}
                >
                  View all {libraries.length} libraries →
                </Button>
              )}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // Define tabs
  const tabs: TabItem[] = [
    {
      id: 'others-stuff',
      label: 'Collections',
      content: yourLibrariesContent,
    },
    {
      id: 'your-stuff',
      label: 'My Shelf',
      content: yourStuffContent,
    },
  ];

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

      {/* Tabbed Folder Content */}
      <TabbedFolderPane
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        showAddButton={false}
      />

      {/* Library Creation Modal */}
      <LibraryCreationModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateLibrary}
        createLibrary={createLibrary}
      />
    </Container>
  );
}
