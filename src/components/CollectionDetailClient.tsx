'use client';

import {
  Add as AddIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
  Inventory as InventoryIcon,
  PersonAdd as PersonAddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Button,
  Chip,
  Stack,
  IconButton,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback, useMemo } from 'react';

import { brandColors, spacing } from '@/theme/brandTokens';

import { EditCollectionModal } from './EditCollectionModal';
import { InviteFriendsModal } from './InviteFriendsModal';
import { LibraryItemCard } from './LibraryItemCard';
import { LibraryMap } from './LibraryMap';
import { VintageCheckoutCardDialog } from './VintageCheckoutCardDialog';

// Types
interface LibraryItem {
  id: string;
  name: string;
  description?: string;
  condition: string;
  imageUrl?: string;
  isAvailable: boolean;
  createdAt: string;
  category: string;
  stuffType?: {
    displayName: string;
    iconPath: string;
    category: string;
  };
  owner: {
    id: string;
    name?: string;
    image?: string;
  };
  isOwnedByUser: boolean;
  currentBorrow?: {
    id: string;
    borrower: {
      id: string;
      name?: string;
      image?: string;
    };
    lender: {
      id: string;
      name?: string;
      image?: string;
    };
    dueDate: string;
    borrowedAt: string;
  };
  notificationQueue: Array<{
    id: string;
    user: {
      id: string;
      name?: string;
      image?: string;
    };
    requestedAt: string;
  }>;
  queueDepth: number;
}

interface LibraryData {
  id: string;
  name: string;
  description?: string;
  location?: string;
  isPublic: boolean;
  createdAt: string;
  owner: {
    id: string;
    name?: string;
    image?: string;
    addresses?: Array<{
      address1: string;
      city: string;
      state: string;
      latitude?: number;
      longitude?: number;
      formattedAddress?: string;
    }>;
  };
  userRole: 'owner' | 'admin' | 'member' | null;
  memberCount: number;
  itemCount: number;
  members: Array<{
    id: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name?: string;
      image?: string;
      addresses?: Array<{
        address1: string;
        city: string;
        state: string;
        latitude?: number;
        longitude?: number;
        formattedAddress?: string;
      }>;
    };
  }>;
  items?: LibraryItem[];
  itemsByCategory: Record<string, LibraryItem[]>;
}

interface CollectionDetailClientProps {
  collectionId: string;
}

// Category display names and icons
const CATEGORY_CONFIG = {
  tools: { name: 'Tools & Hardware', icon: '🔧' },
  sports: { name: 'Sports & Recreation', icon: '⚽' },
  kitchen: { name: 'Kitchen & Dining', icon: '🍳' },
  yard: { name: 'Yard & Garden', icon: '🌱' },
  electronics: { name: 'Electronics', icon: '📱' },
  books: { name: 'Books & Media', icon: '📚' },
  clothing: { name: 'Clothing & Accessories', icon: '👕' },
  furniture: { name: 'Furniture', icon: '🪑' },
  automotive: { name: 'Automotive', icon: '🚗' },
  other: { name: 'Other', icon: '📦' },
};

export function CollectionDetailClient({
  collectionId,
}: CollectionDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [library, setLibrary] = useState<LibraryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutCardOpen, setCheckoutCardOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [settingsMenuAnchor, setSettingsMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);
  const addMenuOpen = Boolean(addMenuAnchor);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/collections/${collectionId}`);
        if (!response.ok) {
          throw new Error('Failed to load library');
        }

        const data = await response.json();
        setLibrary(data.library);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load library');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLibrary();
  }, [collectionId]);

  // Handle welcome banner for new members
  useEffect(() => {
    const message = searchParams.get('message');
    if (message === 'joined_successfully') {
      const welcomeName = searchParams.get('welcomeName');
      if (welcomeName) {
        setCurrentUserName(welcomeName);
      }
      setShowWelcomeBanner(true);

      // Clear the message parameters from URL without page reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('message');
      newUrl.searchParams.delete('welcomeName');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  const handleCloseCheckoutCard = () => {
    setCheckoutCardOpen(false);
    setSelectedItemId(null);
    setSelectedItemName(null);
  };

  const handleAddMenuClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setAddMenuAnchor(event.currentTarget);
    },
    []
  );

  const handleAddMenuClose = useCallback(() => {
    setAddMenuAnchor(null);
  }, []);

  const handleSettingsMenuClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      setSettingsMenuAnchor(event.currentTarget);
    },
    []
  );

  const handleSettingsMenuClose = useCallback(() => {
    setSettingsMenuAnchor(null);
  }, []);

  const handleEditCollection = useCallback(() => {
    handleSettingsMenuClose();
    setEditModalOpen(true);
  }, [handleSettingsMenuClose]);

  const handleManageMembers = useCallback(() => {
    handleSettingsMenuClose();
    // TODO: Open member management modal
    console.log('Manage members');
  }, [handleSettingsMenuClose]);

  const handleCollectionSettings = useCallback(() => {
    handleSettingsMenuClose();
    // TODO: Open advanced settings modal
    console.log('Collection settings');
  }, [handleSettingsMenuClose]);

  const handleSaveCollection = useCallback(
    async (updatedCollection: any) => {
      if (!library) return;

      try {
        const response = await fetch(`/api/collections/${library.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedCollection),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update collection');
        }

        const { collection: updatedData } = await response.json();

        // Optimistically update the local library state
        setLibrary((prev) => (prev ? { ...prev, ...updatedData } : prev));

        // TODO: Show success toast notification
        console.log('Collection updated successfully');
      } catch (error) {
        console.error('Failed to update collection:', error);
        throw error; // Re-throw to let modal handle the error display
      }
    },
    [library]
  );

  const handleAddNewItem = useCallback(() => {
    handleAddMenuClose();
    const params = new URLSearchParams({
      library: collectionId,
    });
    router.push(`/add-item?${params.toString()}`);
  }, [handleAddMenuClose, collectionId, router]);

  const handleAddFromInventory = useCallback(() => {
    handleAddMenuClose();
    router.push(`/stuff/m/add-to-library/${collectionId}`);
  }, [handleAddMenuClose, collectionId, router]);

  // Memoize map props at the top level
  const mapMembers = useMemo(() => {
    if (!library) return [];
    return library.members.map((member) => {
      const address = member.user.addresses?.[0];
      return {
        id: member.user.id,
        name: member.user.name || null,
        image: member.user.image || null,
        address: address?.formattedAddress || address?.address1 || null,
        latitude: address?.latitude,
        longitude: address?.longitude,
      };
    });
  }, [library]);

  const mapCurrentUser = useMemo(
    () => ({
      id: (session?.user as any)?.id || '',
      latitude: library?.owner.addresses?.[0]?.latitude,
      longitude: library?.owner.addresses?.[0]?.longitude,
    }),
    [session?.user, library?.owner.addresses]
  );

  const handleAddItem = (category?: string) => {
    // Navigate to camera-based add item flow
    const params = new URLSearchParams({
      library: collectionId,
      ...(category && { category }),
    });
    router.push(`/add-item?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={48} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={() => router.push('/stacks')}>Return to Lobby</Button>
      </Container>
    );
  }

  if (!library) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">Library not found</Alert>
      </Container>
    );
  }

  const categories = Object.keys(library.itemsByCategory).sort();
  const hasItems = categories.length > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Welcome Banner for New Members */}
      {showWelcomeBanner && (
        <Alert
          severity="success"
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setShowWelcomeBanner(false)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
          sx={{
            mb: 4,
            bgcolor: '#f0f9ff',
            border: '1px solid #3b82f6',
            borderRadius: 2,
            '& .MuiAlert-icon': {
              color: '#3b82f6',
            },
            '& .MuiAlert-message': {
              color: '#1e40af',
              fontSize: '1rem',
              fontWeight: 500,
            },
            '& .MuiAlert-action': {
              color: '#3b82f6',
            },
          }}
        >
          Welcome{currentUserName ? `, ${currentUserName}` : ''}, to{' '}
          {library.name}! 🎉
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ mb: spacing.xl / 16 }}>
        {/* Breadcrumb Navigation */}
        <Box sx={{ mb: spacing.md / 16 }}>
          <Typography
            variant="body2"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.6,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Typography
              component="span"
              onClick={() => router.push('/stacks')}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  opacity: 1,
                  textDecoration: 'underline',
                },
                transition: 'all 0.2s ease',
              }}
            >
              Home
            </Typography>
            <Typography component="span" sx={{ opacity: 0.4 }}>
              /
            </Typography>
            <Typography
              component="span"
              onClick={() => router.push('/stacks')}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  opacity: 1,
                  textDecoration: 'underline',
                },
                transition: 'all 0.2s ease',
              }}
            >
              Collections
            </Typography>
            <Typography component="span" sx={{ opacity: 0.4 }}>
              /
            </Typography>
            <Typography
              component="span"
              sx={{
                fontWeight: 500,
                opacity: 0.8,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: { xs: '120px', sm: '200px', md: 'none' },
              }}
            >
              {library.name}
            </Typography>
          </Typography>
        </Box>

        {/* Collection Name - Visual Hero */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2,
            mb: spacing.sm / 16,
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
              fontWeight: 800,
              color: brandColors.charcoal,
              lineHeight: 1.1,
              flex: 1,
            }}
          >
            {library.name}
          </Typography>

          {/* Collection Settings Menu - Owner/Admin Only */}
          {(library.userRole === 'owner' || library.userRole === 'admin') && (
            <IconButton
              onClick={handleSettingsMenuClick}
              size="medium"
              sx={{
                color: brandColors.charcoal,
                opacity: 0.6,
                mt: 1,
                '&:hover': {
                  opacity: 1,
                  backgroundColor: 'rgba(30, 58, 95, 0.08)',
                },
              }}
              title="Collection Settings"
            >
              <MoreVertIcon />
            </IconButton>
          )}
        </Box>

        {/* Metadata Group - Muted and smaller */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
            mb: spacing.md / 16,
          }}
        >
          <Chip
            label={library.userRole || 'member'}
            size="small"
            sx={{
              bgcolor:
                library.userRole === 'owner' ? brandColors.inkBlue : '#E0E0E0',
              color:
                library.userRole === 'owner' ? 'white' : brandColors.charcoal,
              fontSize: '0.75rem',
            }}
          />
          {!library.isPublic && (
            <Chip
              label="Private"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem' }}
            />
          )}
          <Typography
            variant="body2"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.6,
              fontSize: '0.875rem',
            }}
          >
            Since{' '}
            {new Date(library.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </Typography>
          {library.location && (
            <Typography
              variant="body2"
              sx={{
                color: brandColors.charcoal,
                opacity: 0.6,
                fontSize: '0.875rem',
              }}
            >
              📍 {library.location}
            </Typography>
          )}
        </Box>

        {/* Description */}
        <Typography
          variant="body1"
          sx={{
            color: brandColors.charcoal,
            opacity: 0.8,
            maxWidth: '600px',
            mb: spacing.lg / 16,
            fontSize: { xs: '1rem', md: '1.125rem' },
          }}
        >
          {library.description ||
            `A community library with ${library.memberCount} members sharing ${library.itemCount} items.`}
        </Typography>

        {/* Action Toolbar - Hidden */}
        {false && library.userRole && (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              p: 1.5,
              bgcolor: 'rgba(25, 118, 210, 0.04)',
              borderRadius: 2,
              border: '1px solid rgba(25, 118, 210, 0.12)',
              mb: spacing.md / 16,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: brandColors.charcoal,
                opacity: 0.7,
                fontWeight: 500,
                mr: 1,
              }}
            >
              Quick Actions:
            </Typography>
            <IconButton
              onClick={handleAddMenuClick}
              size="small"
              sx={{
                bgcolor: 'white',
                color: brandColors.inkBlue,
                border: '1px solid rgba(25, 118, 210, 0.2)',
                '&:hover': {
                  bgcolor: 'rgba(25, 118, 210, 0.08)',
                },
              }}
              title="Add Items"
            >
              <AddIcon fontSize="small" />
            </IconButton>
            {(library.userRole === 'owner' || library.userRole === 'admin') && (
              <IconButton
                onClick={() => setInviteModalOpen(true)}
                size="small"
                sx={{
                  bgcolor: 'white',
                  color: brandColors.inkBlue,
                  border: '1px solid rgba(25, 118, 210, 0.2)',
                  '&:hover': {
                    bgcolor: 'rgba(25, 118, 210, 0.08)',
                  },
                }}
                title="Invite Friends"
              >
                <PersonAddIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        )}

        {/* Community Activity Stats - Hidden */}
        {false && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(4, 1fr)',
              },
              gap: { xs: 2, sm: 3 },
              p: 2,
              bgcolor: 'rgba(255, 255, 255, 0.6)',
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.08)',
              mb: spacing.md / 16,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color: brandColors.inkBlue,
                  mb: 0.5,
                  fontSize: { xs: '1.75rem', sm: '2rem' },
                }}
              >
                {library.memberCount}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: brandColors.charcoal,
                  opacity: 0.7,
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                Members
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color: brandColors.inkBlue,
                  mb: 0.5,
                  fontSize: { xs: '1.75rem', sm: '2rem' },
                }}
              >
                {library.itemCount}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: brandColors.charcoal,
                  opacity: 0.7,
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                Total Items
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color: brandColors.mustardYellow,
                  mb: 0.5,
                  fontSize: { xs: '1.75rem', sm: '2rem' },
                }}
              >
                {library.items?.filter(
                  (item) =>
                    item.currentBorrow &&
                    item.currentBorrow.borrower.id !==
                      item.currentBorrow.lender.id // Exclude self-borrows
                ).length || 0}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: brandColors.charcoal,
                  opacity: 0.7,
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                On Loan Now
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  color: '#2E7D32',
                  mb: 0.5,
                  fontSize: { xs: '1.75rem', sm: '2rem' },
                }}
              >
                {library.items?.filter(
                  (item) => item.isAvailable && !item.currentBorrow
                ).length || 0}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: brandColors.charcoal,
                  opacity: 0.7,
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                Available
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Collection Map */}
      <Box sx={{ mb: 4 }}>
        {false && (
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              color: brandColors.charcoal,
              mb: spacing.md / 16,
              fontSize: '1.25rem',
            }}
          >
            Collection Map
          </Typography>
        )}
        <Box
          sx={{
            height: { xs: '250px', sm: '300px', md: '350px' },
            overflow: 'hidden',
            borderRadius: 2,
            border: '1px solid rgba(0, 0, 0, 0.08)',
          }}
        >
          <LibraryMap
            libraryName={library.name}
            members={mapMembers}
            currentUser={mapCurrentUser}
          />
        </Box>
      </Box>

      {/* Filter Chips - moved below map */}
      <Box sx={{ mb: spacing.lg / 16 }}>
        <Stack
          direction="row"
          spacing={spacing.md / 16}
          sx={{ flexWrap: 'wrap', gap: 1 }}
        >
          <Chip
            label={`All ${library.itemCount}`}
            onClick={() => setActiveFilter('all')}
            sx={{
              backgroundColor:
                activeFilter === 'all' ? brandColors.inkBlue : '#F0F0F0',
              color:
                activeFilter === 'all'
                  ? brandColors.white
                  : brandColors.charcoal,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: brandColors.inkBlue,
                color: brandColors.white,
              },
            }}
          />
          {Object.keys(library.itemsByCategory)
            .sort()
            .map((category) => {
              const categoryConfig =
                CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] ||
                CATEGORY_CONFIG.other;
              const itemCount = library.itemsByCategory[category]?.length || 0;

              return (
                <Chip
                  key={category}
                  label={`${categoryConfig.name} ${itemCount}`}
                  onClick={() => setActiveFilter(category)}
                  sx={{
                    backgroundColor:
                      activeFilter === category
                        ? brandColors.inkBlue
                        : '#E8F5E8',
                    color:
                      activeFilter === category ? brandColors.white : '#2E7D32',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: brandColors.inkBlue,
                      color: brandColors.white,
                    },
                  }}
                />
              );
            })}
        </Stack>
      </Box>

      {/* Items by Category */}
      {hasItems ? (
        <Box>
          {/* Show filtered results or all categories */}
          {activeFilter === 'all'
            ? // Show all categories as sections
              categories.map((categoryKey) => {
                const categoryConfig =
                  CATEGORY_CONFIG[
                    categoryKey as keyof typeof CATEGORY_CONFIG
                  ] || CATEGORY_CONFIG.other;
                const items = library.itemsByCategory[categoryKey];

                if (!items || items.length === 0) return null;

                return (
                  <Box key={categoryKey} sx={{ mb: spacing.xl / 16 }}>
                    {/* Category Header */}
                    <Box sx={{ mb: spacing.lg / 16 }}>
                      <Typography
                        variant="h4"
                        sx={{
                          fontSize: { xs: '1.5rem', md: '2rem' },
                          fontWeight: 700,
                          color: brandColors.charcoal,
                          mb: spacing.sm / 16,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: '1.25rem', md: '1.75rem' },
                            mr: 0.5,
                          }}
                        >
                          {categoryConfig.icon}
                        </Typography>
                        {categoryConfig.name}
                      </Typography>
                      <Chip
                        label={`${items.length} item${items.length === 1 ? '' : 's'}`}
                        sx={{
                          backgroundColor: '#E8F5E8',
                          color: '#2E7D32',
                          fontWeight: 600,
                        }}
                      />
                    </Box>

                    {/* Items Grid */}
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
                      {items.map((item) => (
                        <LibraryItemCard key={item.id} item={item} />
                      ))}
                    </Box>
                  </Box>
                );
              })
            : // Show only selected category
              (() => {
                const categoryConfig =
                  CATEGORY_CONFIG[
                    activeFilter as keyof typeof CATEGORY_CONFIG
                  ] || CATEGORY_CONFIG.other;
                const items = library.itemsByCategory[activeFilter] || [];

                return (
                  <Box>
                    {/* Category Header */}
                    <Box sx={{ mb: spacing.lg / 16 }}>
                      <Typography
                        variant="h4"
                        sx={{
                          fontSize: { xs: '1.5rem', md: '2rem' },
                          fontWeight: 700,
                          color: brandColors.charcoal,
                          mb: spacing.sm / 16,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: { xs: '1.25rem', md: '1.75rem' },
                            mr: 0.5,
                          }}
                        >
                          {categoryConfig.icon}
                        </Typography>
                        {categoryConfig.name}
                      </Typography>
                      <Chip
                        label={`${items.length} item${items.length === 1 ? '' : 's'}`}
                        sx={{
                          backgroundColor: '#E8F5E8',
                          color: '#2E7D32',
                          fontWeight: 600,
                        }}
                      />
                    </Box>

                    {/* Items Grid */}
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'repeat(2, 1fr)',
                          sm: 'repeat(3, 1fr)',
                          md: 'repeat(4, 1fr)',
                          lg: 'repeat(5, 1fr)',
                          xl: 'repeat(6, 1fr)',
                        },
                        gap: spacing.md / 16,
                      }}
                    >
                      {items.map((item) => (
                        <LibraryItemCard key={item.id} item={item} />
                      ))}
                    </Box>
                  </Box>
                );
              })()}
        </Box>
      ) : (
        // Empty State - Warmer Design
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 4,
            background: `linear-gradient(135deg, ${brandColors.warmCream} 0%, rgba(255, 248, 230, 0.8) 100%)`,
            borderRadius: 3,
            border: `2px dashed ${brandColors.mustardYellow}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative background elements */}
          <Box
            sx={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'rgba(244, 187, 68, 0.1)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -15,
              left: -15,
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: 'rgba(244, 187, 68, 0.15)',
            }}
          />

          {/* Main illustration */}
          <Typography
            variant="h1"
            sx={{
              fontSize: '4rem',
              mb: 2,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
            }}
          >
            📚✨
          </Typography>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              color: brandColors.charcoal,
              mb: 2,
              fontSize: { xs: '1.5rem', md: '2rem' },
            }}
          >
            Your collection is waiting to come alive! 🌱
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: brandColors.charcoal,
              opacity: 0.8,
              mb: 4,
              maxWidth: '500px',
              mx: 'auto',
              fontSize: '1.1rem',
              lineHeight: 1.6,
            }}
          >
            {library.userRole
              ? `${library.name} is ready for its first treasures! Add items to start building a community where neighbors share, discover, and connect.`
              : `${library.name} is just getting started! Once members add items, you'll see all the wonderful things available to borrow here.`}
          </Typography>

          {library.userRole && (
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => handleAddItem()}
              sx={{
                bgcolor: brandColors.mustardYellow,
                color: brandColors.charcoal,
                fontWeight: 600,
                px: 4,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                fontSize: '1.1rem',
                boxShadow: '0 4px 12px rgba(244, 187, 68, 0.3)',
                '&:hover': {
                  bgcolor: '#E6A645',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(244, 187, 68, 0.4)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              Add Your First Item
            </Button>
          )}
        </Box>
      )}

      {/* Vintage Checkout Card Dialog */}
      {selectedItemId && (
        <VintageCheckoutCardDialog
          open={checkoutCardOpen}
          onClose={handleCloseCheckoutCard}
          itemId={selectedItemId}
          {...(selectedItemName && { itemName: selectedItemName })}
        />
      )}

      {/* Add Items Dropdown Menu */}
      <Menu
        anchorEl={addMenuAnchor}
        open={addMenuOpen}
        onClose={handleAddMenuClose}
        disablePortal={false}
        MenuListProps={{
          'aria-labelledby': 'add-items-button',
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              zIndex: 9999, // High z-index to stay above map
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: 2,
            },
          },
        }}
      >
        <MenuItem onClick={handleAddNewItem}>
          <ListItemIcon>
            <PhotoCameraIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Take Photo"
            secondary="Add a new item by taking a photo"
          />
        </MenuItem>
        <MenuItem onClick={handleAddFromInventory}>
          <ListItemIcon>
            <InventoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="From Inventory"
            secondary="Select from your existing items"
          />
        </MenuItem>
      </Menu>

      {/* Collection Settings Menu - Owner/Admin Only */}
      <Menu
        anchorEl={settingsMenuAnchor}
        open={Boolean(settingsMenuAnchor)}
        onClose={handleSettingsMenuClose}
        disablePortal={false}
        MenuListProps={{
          'aria-labelledby': 'collection-settings-button',
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              zIndex: 9999,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: 2,
              minWidth: 220,
            },
          },
        }}
      >
        <MenuItem onClick={handleEditCollection}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Edit Collection"
            secondary="Update name, description, and location"
          />
        </MenuItem>
        <MenuItem onClick={handleManageMembers}>
          <ListItemIcon>
            <PeopleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Manage Members"
            secondary="Add, remove, or change member roles"
          />
        </MenuItem>
        <MenuItem onClick={handleCollectionSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Collection Settings"
            secondary="Privacy, permissions, and advanced options"
          />
        </MenuItem>
        {library?.userRole === 'owner' && (
          <MenuItem
            onClick={handleSettingsMenuClose}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <ArchiveIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText
              primary="Archive Collection"
              secondary="Hide from public view"
            />
          </MenuItem>
        )}
      </Menu>

      {/* Edit Collection Modal */}
      {library && (
        <EditCollectionModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          collection={{
            id: library.id,
            name: library.name,
            description: library.description ?? undefined,
            location: library.location ?? undefined,
            isPublic: library.isPublic,
          }}
          onSave={handleSaveCollection}
        />
      )}

      {/* Invite Friends Modal */}
      <InviteFriendsModal
        libraryId={collectionId}
        libraryName={library?.name || ''}
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </Container>
  );
}
