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
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  useMediaQuery,
  useTheme,
  Alert,
  Snackbar,
} from '@mui/material';
import Link from 'next/link';
import { useState } from 'react';

import { useBorrowRequests } from '@/hooks/useBorrowRequests';
import { useCollections } from '@/hooks/useCollections';
import { useUserItems } from '@/hooks/useUserItems';
import { brandColors } from '@/theme/brandTokens';

import { CollectionCard, CreateCollectionCard } from './CollectionCard';
import { CollectionCreationModal } from './CollectionCreationModal';
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
type CollectionFilterType = 'all' | 'started' | 'joined';

export function LobbyClient({ user, showWelcome }: LobbyClientProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { collections, isLoading, createCollection } = useCollections();
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
  const [collectionFilter, setCollectionFilter] =
    useState<CollectionFilterType>('all');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [createdCollectionName, setCreatedCollectionName] = useState('');

  const handleCreateCollection = (collection: { name?: string }) => {
    setCreatedCollectionName(collection.name || 'Your collection');
    setShowSuccessMessage(true);

    // Hide success message after 4 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 4000);
  };

  const handleFilterChange = (event: SelectChangeEvent) => {
    setItemFilter(event.target.value as FilterType);
  };

  const handleCollectionFilterChange = (event: SelectChangeEvent) => {
    setCollectionFilter(event.target.value as CollectionFilterType);
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

  // Section component for grouped display
  const ItemSection = ({
    title,
    items,
    statusType,
    showAddItem = false,
  }: {
    title: string;
    items: Array<{ id: string; status: string }>;
    statusType: string;
    showAddItem?: boolean;
  }) => {
    if (items.length === 0 && !showAddItem) return null;

    return (
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: brandColors.charcoal,
            mb: 2,
            fontSize: { xs: '1.1rem', md: '1.25rem' },
          }}
        >
          {title} ({items.length})
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)', // Always 2 columns on mobile
              md: 'repeat(4, 1fr)', // 4 columns on medium screens
              lg: 'repeat(5, 1fr)', // 5 columns on large screens
              xl: 'repeat(6, 1fr)', // 6 columns on extra large screens
            },
            gap: 1,
          }}
        >
          {showAddItem && <AddItemCard />}
          {items.map((item) => (
            <UserItemCard
              key={`${statusType}-${item.id}`}
              item={item}
              status={
                item.status as
                  | 'ready-to-lend'
                  | 'on-loan'
                  | 'offline'
                  | 'borrowed'
              }
            />
          ))}
        </Box>
      </Box>
    );
  };

  const filteredItems =
    itemFilter === 'all'
      ? allItems
      : allItems.filter((item) => item.status === itemFilter);

  // Collection filtering and counts
  const startedCollections = collections.filter(
    (collection) => collection.role === 'owner'
  );
  const joinedCollections = collections.filter(
    (collection) => collection.role !== 'owner'
  );

  const filteredCollections =
    collectionFilter === 'all'
      ? collections
      : collectionFilter === 'started'
        ? startedCollections
        : joinedCollections;

  // Collection section component
  const CollectionSection = ({
    title,
    collections: sectionCollections,
    showCreateCard = false,
  }: {
    title: string;
    collections: Array<{ id: string; role: string }>;
    showCreateCard?: boolean;
  }) => {
    if (sectionCollections.length === 0 && !showCreateCard) return null;

    return (
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: brandColors.charcoal,
            mb: 2,
            fontSize: { xs: '1.1rem', md: '1.25rem' },
          }}
        >
          {title} ({sectionCollections.length})
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)', // Always 2 columns on mobile - matches My Shelf
              md: 'repeat(4, 1fr)', // 4 columns on medium screens - matches My Shelf
              lg: 'repeat(5, 1fr)', // 5 columns on large screens - matches My Shelf
              xl: 'repeat(6, 1fr)', // 6 columns on extra large screens - matches My Shelf
            },
            gap: 1,
          }}
        >
          {showCreateCard && (
            <CreateCollectionCard onClick={() => setIsCreateModalOpen(true)} />
          )}
          {sectionCollections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </Box>
      </Box>
    );
  };

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
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        {itemsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={40} />
          </Box>
        ) : (
          <>
            {/* Filter Control */}
            <Box sx={{ mb: 3 }}>
              {isMobile ? (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    value={itemFilter}
                    onChange={handleFilterChange}
                    displayEmpty
                    sx={{
                      backgroundColor: brandColors.white,
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: brandColors.softGray,
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: brandColors.inkBlue,
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: brandColors.inkBlue,
                      },
                    }}
                  >
                    <MenuItem value="all">
                      All Items ({allItems.length})
                    </MenuItem>
                    <MenuItem value="ready-to-lend">
                      Ready to Lend ({readyToLendCount})
                    </MenuItem>
                    <MenuItem value="on-loan">On Loan ({onLoanCount})</MenuItem>
                    {offlineCount > 0 && (
                      <MenuItem value="offline">
                        Offline ({offlineCount})
                      </MenuItem>
                    )}
                    <MenuItem value="borrowed">
                      Borrowed ({borrowedCount})
                    </MenuItem>
                  </Select>
                </FormControl>
              ) : (
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
                      color:
                        itemFilter === 'all' ? brandColors.white : '#2E7D32',
                      fontWeight: 600,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor:
                          itemFilter === 'all'
                            ? '#1a2f4f'
                            : brandColors.inkBlue,
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
                        itemFilter === 'on-loan'
                          ? brandColors.white
                          : '#2E7D32',
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
                        itemFilter === 'borrowed'
                          ? brandColors.white
                          : '#2E7D32',
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
              )}
            </Box>

            {/* Items Display */}
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
            ) : itemFilter === 'all' ? (
              // Show all sections with headers when "All" is selected
              <>
                <ItemSection
                  title="Ready to Lend"
                  items={readyToLendItems}
                  statusType="ready-to-lend"
                  showAddItem={true}
                />
                <ItemSection
                  title="On Loan"
                  items={onLoanItems}
                  statusType="on-loan"
                />
                <ItemSection
                  title="Borrowed"
                  items={borrowedItems}
                  statusType="borrowed"
                />
                {offlineCount > 0 && (
                  <ItemSection
                    title="Offline"
                    items={offlineItems}
                    statusType="offline"
                  />
                )}
              </>
            ) : (
              // Show filtered items in a single grid when specific filter is selected
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)', // Always 2 columns on mobile
                    md: 'repeat(4, 1fr)', // 4 columns on medium screens
                    lg: 'repeat(5, 1fr)', // 5 columns on large screens
                    xl: 'repeat(6, 1fr)', // 6 columns on extra large screens
                  },
                  gap: 1,
                }}
              >
                {filteredItems.map((item) => (
                  <UserItemCard
                    key={`${item.status}-${item.id}`}
                    item={item}
                    status={
                      item.status as
                        | 'ready-to-lend'
                        | 'on-loan'
                        | 'offline'
                        | 'borrowed'
                    }
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
  const yourCollectionsContent = (
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
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={40} />
          </Box>
        ) : collections.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                backgroundColor: brandColors.mustardYellow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <Typography variant="h3" sx={{ color: brandColors.charcoal }}>
                ➕
              </Typography>
            </Box>

            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                color: brandColors.charcoal,
                mb: 2,
              }}
            >
              Start Your First Collection
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 500, mx: 'auto', lineHeight: 1.6 }}
            >
              Collections are private sharing circles where you and people you
              trust can lend and borrow items. Create one for your family,
              friend group, or neighbors.
            </Typography>

            <Box sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: brandColors.inkBlue,
                  mb: 2,
                }}
              >
                Examples:
              </Typography>
              <Stack spacing={1.5} sx={{ textAlign: 'left' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: brandColors.mustardYellow,
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    <strong>&ldquo;Smith Family&rdquo;</strong> - Share tools,
                    books, and games between relatives
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: brandColors.mustardYellow,
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    <strong>&ldquo;Oak Street Neighbors&rdquo;</strong> - Lend
                    lawn equipment and household items
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: brandColors.mustardYellow,
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    <strong>&ldquo;College Friends&rdquo;</strong> - Share
                    textbooks, electronics, and camping gear
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateModalOpen(true)}
              sx={{
                borderRadius: 3,
                px: 4,
                py: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1.1rem',
                backgroundColor: brandColors.mustardYellow,
                color: brandColors.charcoal,
                boxShadow: '0 4px 12px rgba(244, 187, 68, 0.3)',
                '&:hover': {
                  backgroundColor: '#C19E04',
                  boxShadow: '0 6px 16px rgba(244, 187, 68, 0.4)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              Create Your First Collection
            </Button>
          </Box>
        ) : (
          <Box>
            {/* Filter Control - matches My Shelf tab */}
            <Box sx={{ mb: 3 }}>
              {isMobile ? (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    value={collectionFilter}
                    onChange={handleCollectionFilterChange}
                    displayEmpty
                    sx={{
                      backgroundColor: brandColors.white,
                      borderRadius: 2,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: brandColors.softGray,
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: brandColors.inkBlue,
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: brandColors.inkBlue,
                      },
                    }}
                  >
                    <MenuItem value="all">
                      All Collections ({collections.length})
                    </MenuItem>
                    {startedCollections.length > 0 && (
                      <MenuItem value="started">
                        Collections I Started ({startedCollections.length})
                      </MenuItem>
                    )}
                    {joinedCollections.length > 0 && (
                      <MenuItem value="joined">
                        Collections I Joined ({joinedCollections.length})
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
              ) : (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: 'wrap', gap: 1 }}
                >
                  <Chip
                    label={`All (${collections.length})`}
                    onClick={() => setCollectionFilter('all')}
                    sx={{
                      backgroundColor:
                        collectionFilter === 'all'
                          ? brandColors.inkBlue
                          : '#E8F5E8',
                      color:
                        collectionFilter === 'all'
                          ? brandColors.white
                          : '#2E7D32',
                      fontWeight: 600,
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor:
                          collectionFilter === 'all'
                            ? '#1a2f4f'
                            : brandColors.inkBlue,
                        color: brandColors.white,
                      },
                    }}
                  />
                  {startedCollections.length > 0 && (
                    <Chip
                      label={`Started (${startedCollections.length})`}
                      onClick={() => setCollectionFilter('started')}
                      sx={{
                        backgroundColor:
                          collectionFilter === 'started'
                            ? brandColors.inkBlue
                            : '#E8F5E8',
                        color:
                          collectionFilter === 'started'
                            ? brandColors.white
                            : '#2E7D32',
                        fontWeight: 600,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor:
                            collectionFilter === 'started'
                              ? '#1a2f4f'
                              : brandColors.inkBlue,
                          color: brandColors.white,
                        },
                      }}
                    />
                  )}
                  {joinedCollections.length > 0 && (
                    <Chip
                      label={`Joined (${joinedCollections.length})`}
                      onClick={() => setCollectionFilter('joined')}
                      sx={{
                        backgroundColor:
                          collectionFilter === 'joined'
                            ? brandColors.inkBlue
                            : '#E8F5E8',
                        color:
                          collectionFilter === 'joined'
                            ? brandColors.white
                            : '#2E7D32',
                        fontWeight: 600,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor:
                            collectionFilter === 'joined'
                              ? '#1a2f4f'
                              : brandColors.inkBlue,
                          color: brandColors.white,
                        },
                      }}
                    />
                  )}
                </Stack>
              )}
            </Box>

            {/* Collections Sections */}
            {collectionFilter === 'all' ? (
              <>
                {/* Show sections when viewing all */}
                <CollectionSection
                  title="Collections I Started"
                  collections={startedCollections}
                  showCreateCard={true}
                />
                <CollectionSection
                  title="Collections I Joined"
                  collections={joinedCollections}
                />
              </>
            ) : (
              /* Show single filtered section */
              <CollectionSection
                title={
                  collectionFilter === 'started'
                    ? 'Collections I Started'
                    : 'Collections I Joined'
                }
                collections={filteredCollections}
                showCreateCard={collectionFilter === 'started'}
              />
            )}
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
      content: yourCollectionsContent,
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

      {/* Collection Creation Modal */}
      <CollectionCreationModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateCollection}
        createCollection={createCollection}
      />

      {/* Success Message */}
      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={4000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowSuccessMessage(false)}
          severity="success"
          variant="filled"
          sx={{
            backgroundColor: brandColors.inkBlue,
            color: brandColors.white,
          }}
        >
          🎉 <strong>&ldquo;{createdCollectionName}&rdquo;</strong> collection
          created successfully!
        </Alert>
      </Snackbar>
    </Container>
  );
}
