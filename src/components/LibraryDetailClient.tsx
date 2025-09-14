'use client';

import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
  Inventory as InventoryIcon,
  PersonAdd as PersonAddIcon,
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
  Paper,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback, useMemo } from 'react';

import { brandColors, spacing } from '@/theme/brandTokens';

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

interface LibraryDetailClientProps {
  libraryId: string;
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

export function LibraryDetailClient({ libraryId }: LibraryDetailClientProps) {
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
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [addMenuAnchor, setAddMenuAnchor] = useState<null | HTMLElement>(null);
  const addMenuOpen = Boolean(addMenuAnchor);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/libraries/${libraryId}`);
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
  }, [libraryId]);

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

  const handleAddNewItem = useCallback(() => {
    handleAddMenuClose();
    const params = new URLSearchParams({
      library: libraryId,
    });
    router.push(`/add-item?${params.toString()}`);
  }, [handleAddMenuClose, libraryId, router]);

  const handleAddFromInventory = useCallback(() => {
    handleAddMenuClose();
    router.push(`/stuff/m/add-to-library/${libraryId}`);
  }, [handleAddMenuClose, libraryId, router]);

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
      library: libraryId,
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
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()}>
          Go Back
        </Button>
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
        {/* Top Navigation Row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: spacing.md / 16,
          }}
        >
          <Button
            onClick={() => router.push('/stacks')}
            startIcon={<ArrowBackIcon />}
            sx={{
              color: brandColors.inkBlue,
              textTransform: 'none',
            }}
          >
            Back to Lobby
          </Button>

          {/* Action Icons Row */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {library.userRole && (
              <IconButton
                onClick={handleAddMenuClick}
                sx={{
                  bgcolor: 'rgba(25, 118, 210, 0.08)',
                  color: brandColors.inkBlue,
                  '&:hover': {
                    bgcolor: 'rgba(25, 118, 210, 0.12)',
                  },
                }}
                title="Add Items"
              >
                <AddIcon />
              </IconButton>
            )}
            {(library.userRole === 'owner' || library.userRole === 'admin') && (
              <IconButton
                onClick={() => setInviteModalOpen(true)}
                sx={{
                  bgcolor: 'rgba(25, 118, 210, 0.08)',
                  color: brandColors.inkBlue,
                  '&:hover': {
                    bgcolor: 'rgba(25, 118, 210, 0.12)',
                  },
                }}
                title="Invite Friends"
              >
                <PersonAddIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Owner/Private Chips */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: spacing.xs / 16,
          }}
        >
          <Chip
            label={library.userRole || 'member'}
            size="small"
            color={library.userRole === 'owner' ? 'primary' : 'default'}
          />
          {!library.isPublic && (
            <Chip label="Private" size="small" variant="outlined" />
          )}
        </Box>

        {/* Library Title */}
        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '2rem', md: '2.5rem' },
            fontWeight: 700,
            color: brandColors.charcoal,
            mb: spacing.sm / 16,
          }}
        >
          {library.name}
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: brandColors.charcoal,
            opacity: 0.8,
            maxWidth: '600px',
            mb: spacing.xs / 16,
          }}
        >
          {library.description ||
            `A community library with ${library.memberCount} members sharing ${library.itemCount} items.`}
        </Typography>

        {/* Since date */}
        <Typography
          variant="body2"
          sx={{
            color: brandColors.charcoal,
            opacity: 0.6,
            fontStyle: 'italic',
            mb: spacing.md / 16,
          }}
        >
          Since{' '}
          {new Date(library.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </Typography>

        {/* Community Activity Stats */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            flexWrap: 'wrap',
            mb: spacing.md / 16,
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: brandColors.inkBlue, mb: 0 }}
            >
              {library.memberCount}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              Members
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: brandColors.inkBlue, mb: 0 }}
            >
              {library.itemCount}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              Total Items
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: brandColors.mustardYellow, mb: 0 }}
            >
              {library.items?.filter(
                (item) =>
                  item.currentBorrow &&
                  item.currentBorrow.borrower.id !==
                    item.currentBorrow.lender.id // Exclude self-borrows
              ).length || 0}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              On Loan Now
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: '#2E7D32', mb: 0 }}
            >
              {library.items?.filter(
                (item) => item.isAvailable && !item.currentBorrow
              ).length || 0}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600 }}
            >
              Available
            </Typography>
          </Box>
          {library.location && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                ml: 'auto',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                📍 {library.location}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Library Members Map */}
      <Box sx={{ mb: 4 }}>
        <LibraryMap
          libraryName={library.name}
          members={mapMembers}
          currentUser={mapCurrentUser}
        />
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
        // Empty State
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            No items in {library.name} yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Be the first to add items for your community to share!
          </Typography>
          {library.userRole && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleAddItem()}
              sx={{
                bgcolor: brandColors.inkBlue,
                '&:hover': { bgcolor: '#1a2f4f' },
              }}
            >
              Add First Item
            </Button>
          )}
        </Paper>
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

      {/* Invite Friends Modal */}
      <InviteFriendsModal
        libraryId={libraryId}
        libraryName={library?.name || ''}
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </Container>
  );
}
