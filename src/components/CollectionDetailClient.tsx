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
  Construction as ConstructionIcon,
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
  Card,
  CardContent,
} from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback, useMemo } from 'react';

import { brandColors, spacing } from '@/theme/brandTokens';

import { EditCollectionModal } from './EditCollectionModal';
import { ExpandableText } from './ExpandableText';
import { LibraryItemCard } from './LibraryItemCard';
import { LibraryMap } from './LibraryMap';
import { ManageMembersModal } from './ManageMembersModal';
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
  inviteRateLimitPerHour?: number;
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
  userRole: 'owner' | 'admin' | 'member' | 'guest' | null;
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
  const [manageInitialTab, setManageInitialTab] = useState<0 | 1>(0);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [settingsMenuAnchor, setSettingsMenuAnchor] =
    useState<HTMLElement | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  // const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [manageMembersModalOpen, setManageMembersModalOpen] = useState(false);
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
        setLibrary(data.collection);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load library');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLibrary();
  }, [collectionId]);

  // Handle guest invite token storage and welcome banner for new members
  useEffect(() => {
    const message = searchParams.get('message');
    const isGuest = searchParams.get('guest') === '1';

    // Store invite token for guests (backup for cookie issues during auth flow)
    if (isGuest && typeof window !== 'undefined') {
      // Try to get invite token from cookies and store in localStorage as backup
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return undefined;
      };

      const inviteToken = getCookie('invite_token');
      const inviteLibrary = getCookie('invite_library');

      console.log('[CollectionDetailClient] guest access detected', {
        collectionId,
        hasInviteToken: !!inviteToken,
        hasInviteLibrary: !!inviteLibrary,
        inviteLibraryMatch: inviteLibrary === collectionId,
      });

      if (inviteToken && inviteLibrary === collectionId) {
        localStorage.setItem(`invite_token_${collectionId}`, inviteToken);
        console.log(
          '[CollectionDetailClient] stored invite token in localStorage'
        );
      }
    }

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
  }, [searchParams, collectionId]);

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
    setManageMembersModalOpen(true);
  }, [handleSettingsMenuClose]);

  // Removed: Collection Settings no longer used

  const handleSaveCollection = useCallback(
    async (
      updatedCollection: Partial<{
        name: string;
        description?: string | undefined;
        location?: string | undefined;
        isPublic: boolean;
      }>
    ) => {
      if (!library) return;

      console.log('Saving collection changes:', updatedCollection);
      console.log('Library ID:', library?.id);

      try {
        const response = await fetch(`/api/collections/${library?.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedCollection),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('API Error Response:', errorData);
          console.error('Response status:', response.status);
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

  const handleMembershipChanged = useCallback(() => {
    // Refresh the collection data when membership changes
    const fetchLibrary = async () => {
      try {
        const response = await fetch(`/api/collections/${collectionId}`);
        if (!response.ok) {
          throw new Error('Failed to load library');
        }

        const data = await response.json();
        setLibrary(data.collection);
      } catch (err) {
        console.error('Error refreshing collection:', err);
      }
    };

    fetchLibrary();
  }, [collectionId]);

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

  const joinLibrary = useCallback(async () => {
    if (!library) return;
    try {
      // Try to get invite token from localStorage (backup for lost cookies)
      const storedInviteToken = localStorage.getItem(
        `invite_token_${collectionId}`
      );
      console.log('[CollectionDetailClient] joinLibrary attempt', {
        collectionId,
        hasStoredToken: !!storedInviteToken,
      });

      const requestBody: { inviteToken?: string } = {};
      if (storedInviteToken) {
        requestBody.inviteToken = storedInviteToken;
      }

      const res = await fetch(`/api/collections/${collectionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        // Clean up stored invite token on successful join
        localStorage.removeItem(`invite_token_${collectionId}`);
        window.location.reload();
      } else if (res.status === 401) {
        // Store invite token in localStorage before redirecting to auth
        if (storedInviteToken) {
          localStorage.setItem(
            `invite_token_${collectionId}`,
            storedInviteToken
          );
        }
        // Always route through our smart auth callback so invite consumption
        // and profile completion logic can run before landing on the library
        const callback = encodeURIComponent('/auth/callback');
        window.location.href = `/auth/signin?callbackUrl=${callback}`;
      } else {
        const data = await res.json().catch(() => ({}));
        console.error('[CollectionDetailClient] join failed', {
          status: res.status,
          error: data.error,
        });
        alert(data.error || 'Failed to join library');
      }
    } catch (e) {
      console.error('Join library failed', e);
      alert('Failed to join library');
    }
  }, [collectionId, library]);

  // Memoize map props at the top level
  const mapMembers = useMemo(() => {
    if (!library) return [];
    return library?.members.map((member) => {
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
      id: (session?.user as { id?: string })?.id || '',
      latitude: library?.owner.addresses?.[0]?.latitude,
      longitude: library?.owner.addresses?.[0]?.longitude,
    }),
    [session?.user, library?.owner.addresses]
  );

  // const handleToggleVisibility = useCallback(
  //   async (isPublic: boolean) => {
  //     if (!library) return;
  //     await handleSaveCollection({ isPublic });
  //   },
  //   [library, handleSaveCollection]
  // );

  // const handleFromSettingsEditCollection = useCallback(() => {
  //   setSettingsModalOpen(false);
  //   setEditModalOpen(true);
  // }, []);

  // const handleFromSettingsManageMembers = useCallback(() => {
  //   setSettingsModalOpen(false);
  //   setManageMembersModalOpen(true);
  // }, []);

  const handleArchiveCollection = useCallback(async () => {
    if (!library) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to archive "${library?.name}"?\n\n` +
        'This will:\n' +
        '• Hide the collection from your active collections\n' +
        '• Preserve all items and member data\n' +
        '• Allow you to unarchive it later\n\n' +
        'This action can be undone.'
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/collections/${library?.id}/archive`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to archive collection');
      }

      await response.json();

      // Show success message and redirect
      alert(`Collection "${library?.name}" has been archived successfully.`);
      router.push('/stacks');
    } catch (error) {
      console.error('Error archiving collection:', error);
      alert(
        error instanceof Error ? error.message : 'Failed to archive collection'
      );
    }
  }, [library, router]);

  const handleDeleteCollection = useCallback(async () => {
    if (!library) return;
    const confirmed = window.confirm(
      `Permanently delete "${library?.name}"?\n\n` +
        'This will:\n' +
        '• Remove the library\n' +
        '• You must remove all items and members first\n\n' +
        'This action cannot be undone.'
    );
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/collections/${library?.id}`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete library');
      }
      alert('Library deleted successfully');
      router.push('/stacks');
    } catch (error) {
      console.error('Error deleting library:', error);
      alert(
        error instanceof Error ? error.message : 'Failed to delete library'
      );
    }
  }, [library, router]);

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

  const categories = Object.keys(library?.itemsByCategory).sort();
  const hasItems = categories.length > 0;

  return (
    <Container maxWidth="lg" sx={{ py: 4, position: 'relative' }}>
      {/* Guest Banner (magic link guest pass) */}
      {library?.userRole === 'guest' && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            mb: 2,
            borderRadius: 2,
            border: '1px solid rgba(25,118,210,0.2)',
            bgcolor: 'rgba(25,118,210,0.05)',
          }}
        >
          <Box>
            <Typography
              sx={{ color: brandColors.charcoal, mb: 1, fontWeight: 600 }}
            >
              Welcome! Check this out 👋
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              This is a library of &lsquo;stuff&rsquo; — where folks can make
              their lendable stuff more visible, so it&rsquo;s easier to share
              more and buy less as a community. Take a look around. Instructions
              on how to join at the bottom!
            </Typography>
          </Box>
        </Box>
      )}

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
          {library?.name}! 🎉
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
              Libraries
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
              Current Library
            </Typography>
          </Typography>
        </Box>

        {/* Collection Settings Menu - Owner/Admin Only - Upper Right Corner */}
        {(library?.userRole === 'owner' || library?.userRole === 'admin') && (
          <IconButton
            onClick={handleSettingsMenuClick}
            size="medium"
            sx={{
              position: 'absolute',
              top: { xs: 16, sm: 24 },
              right: { xs: 16, sm: 24 },
              color: brandColors.charcoal,
              opacity: 0.6,
              zIndex: 10,
              '&:hover': {
                opacity: 1,
                backgroundColor: 'rgba(30, 58, 95, 0.08)',
              },
            }}
            title="Library Settings"
          >
            <MoreVertIcon />
          </IconButton>
        )}

        {/* Library Name - Visual Hero */}
        <Box
          sx={{
            mb: spacing.sm / 16,
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.25rem', sm: '2.75rem', md: '3.25rem' },
              fontWeight: 800,
              color: brandColors.charcoal,
              lineHeight: 1.15,
              // Allow natural wrapping; avoid clipping from line-clamp
              whiteSpace: 'normal',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
            }}
          >
            {library?.name}
          </Typography>
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
          {library?.userRole === 'owner' ? (
            <Chip
              icon={<ConstructionIcon sx={{ fontSize: 16 }} />}
              label="Owner"
              size="small"
              sx={{
                backgroundColor: '#E8F5E8',
                color: '#2E7D32',
                fontSize: '0.75rem',
                '& .MuiChip-icon': {
                  color: '#2E7D32',
                },
              }}
            />
          ) : (
            <Chip
              label={library?.userRole || 'member'}
              size="small"
              sx={{
                bgcolor: '#E0E0E0',
                color: brandColors.charcoal,
                fontSize: '0.75rem',
              }}
            />
          )}
          {!library?.isPublic && (
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
            {new Date(library?.createdAt || '').toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </Typography>
          {library?.location && (
            <Typography
              variant="body2"
              sx={{
                color: brandColors.charcoal,
                opacity: 0.6,
                fontSize: '0.875rem',
              }}
            >
              📍 {library?.location}
            </Typography>
          )}
        </Box>

        {/* Description */}
        <ExpandableText
          text={
            library?.description ||
            `A community library with ${library?.memberCount} members sharing ${library?.itemCount} items.`
          }
          maxLength={180}
          variant="body1"
          sx={{
            color: brandColors.charcoal,
            opacity: 0.8,
            maxWidth: '600px',
            mb: spacing.lg / 16,
            fontSize: { xs: '1rem', md: '1.125rem' },
          }}
        />

        {/* Action Toolbar - Hidden */}
        {false && library?.userRole && (
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
            {(library?.userRole === 'owner' ||
              library?.userRole === 'admin') && (
              <IconButton
                onClick={() => {
                  setManageInitialTab(1);
                  setManageMembersModalOpen(true);
                }}
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
                {library?.memberCount}
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
                {library?.itemCount}
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
                {library?.items?.filter(
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
                {library?.items?.filter(
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
            Library Map
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
            libraryName={library?.name}
            members={mapMembers}
            currentUser={mapCurrentUser}
            isGuest={library?.userRole === 'guest'}
          />
        </Box>
      </Box>

      {/* Privacy explanation for guests - under map */}
      {library?.userRole === 'guest' && (
        <Box
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: 'rgba(0, 0, 0, 0.02)',
            border: '1px solid rgba(0, 0, 0, 0.06)',
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', textAlign: 'center' }}
          >
            We keep member details private until you join—that&rsquo;s just one
            of the perks of being part of a trusted community! Once you&rsquo;re
            in, you&rsquo;ll see who&rsquo;s who.
          </Typography>
        </Box>
      )}

      {/* Filter Chips - moved below map */}
      <Box sx={{ mb: spacing.lg / 16 }}>
        <Stack
          direction="row"
          spacing={spacing.md / 16}
          sx={{ flexWrap: 'wrap', gap: 1 }}
        >
          <Chip
            label={`All ${library?.itemCount}`}
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
          {Object.keys(library?.itemsByCategory)
            .sort()
            .map((category) => {
              const categoryConfig =
                CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] ||
                CATEGORY_CONFIG.other;
              const itemCount = library?.itemsByCategory[category]?.length || 0;

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
                const items = library?.itemsByCategory[categoryKey];

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
                        <LibraryItemCard
                          key={item.id}
                          item={item}
                          libraryId={collectionId}
                          isGuest={library?.userRole === 'guest'}
                        />
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
                const items = library?.itemsByCategory[activeFilter] || [];

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
                        <LibraryItemCard
                          key={item.id}
                          item={item}
                          libraryId={collectionId}
                          isGuest={library?.userRole === 'guest'}
                        />
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
            🔨🪜⛺
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
            {library?.userRole
              ? `${library?.name} is ready for its first treasures! Add items to start building a community where neighbors share, discover, and connect.`
              : `${library?.name} is just getting started! Once members add items, you'll see all the wonderful things available to borrow here.`}
          </Typography>

          {library?.userRole && (
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleAddFromInventory}
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

      {/* Join section for guests - after items */}
      {library?.userRole === 'guest' && (
        <Box
          sx={{
            mt: spacing.xl / 16,
            mb: spacing.xl / 16,
            p: 3,
            borderRadius: 2,
            border: '1px solid rgba(25,118,210,0.2)',
            bgcolor: 'rgba(25,118,210,0.05)',
            textAlign: 'center',
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: brandColors.charcoal, mb: 2 }}
          >
            Ready to join? It&rsquo;s easy:
          </Typography>
          <Box
            component="ol"
            sx={{
              pl: 2,
              m: 0,
              mb: 3,
              display: 'inline-block',
              textAlign: 'left',
              '& li': {
                mb: 0.5,
                fontSize: '0.875rem',
                color: 'text.secondary',
              },
            }}
          >
            <li>Fill out a quick library card with your photo and address</li>
            <li>Get verified by the community (usually same day!)</li>
            <li>Start borrowing, lending, and saving money together</li>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button variant="contained" size="small" onClick={joinLibrary}>
              Sign me up!
            </Button>
          </Box>
        </Box>
      )}

      {/* Add Your Stuff section */}
      {(library?.userRole === 'owner' || library?.userRole === 'admin') && (
        <Box sx={{ mt: spacing.xl / 16, mb: spacing.xl / 16 }}>
          <Typography
            variant="h5"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontWeight: 700,
              color: brandColors.charcoal,
              mb: spacing.md / 16,
            }}
          >
            <span role="img" aria-label="add">
              ➕📦
            </span>{' '}
            Add Your Stuff
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(4, 1fr)',
                lg: 'repeat(5, 1fr)',
              },
              gap: 1,
            }}
          >
            <Card
              onClick={handleAddFromInventory}
              sx={{
                cursor: 'pointer',
                position: 'relative',
                border: '2px dashed',
                borderColor: brandColors.mustardYellow,
                backgroundColor: 'rgba(244, 187, 68, 0.1)',
                borderRadius: 2,
                overflow: 'visible',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: brandColors.charcoal,
                  backgroundColor: 'rgba(244, 187, 68, 0.2)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -8,
                  right: 20,
                  width: 60,
                  height: 16,
                  backgroundColor: brandColors.mustardYellow,
                  borderRadius: '8px 8px 0 0',
                },
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1/1',
                    backgroundColor: 'rgba(244, 187, 68, 0.1)',
                    borderRadius: 1,
                    border: '2px dashed',
                    borderColor: brandColors.mustardYellow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1,
                    overflow: 'hidden',
                  }}
                >
                  <AddIcon
                    sx={{ fontSize: 48, color: brandColors.mustardYellow }}
                  />
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: brandColors.charcoal,
                    textAlign: 'center',
                  }}
                >
                  Add Item
                </Typography>
              </CardContent>
            </Card>
          </Box>
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
        MenuListProps={{ 'aria-labelledby': 'collection-settings-button' }}
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
            primary="Edit Library"
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
        {/* Removed Collection Settings; moved danger zone into Edit Library */}
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

      {/* Edit Library Modal (with Danger Zone actions) */}
      {library && (
        <EditCollectionModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          collection={{
            id: library?.id,
            name: library?.name,
            description: library?.description ?? undefined,
            location: library?.location ?? undefined,
            isPublic: library?.isPublic,
            inviteRateLimitPerHour: (library as any).inviteRateLimitPerHour,
          }}
          onSave={handleSaveCollection}
          {...(library?.userRole === 'owner'
            ? {
                onArchiveCollection: handleArchiveCollection,
                onDeleteCollection: handleDeleteCollection,
              }
            : {})}
        />
      )}

      {/* Manage Members Modal */}
      <ManageMembersModal
        collectionId={collectionId}
        collectionName={library?.name || ''}
        userRole={
          library?.userRole === 'guest' ? null : library?.userRole || null
        }
        open={manageMembersModalOpen}
        onClose={() => setManageMembersModalOpen(false)}
        initialTab={manageInitialTab}
        onMembershipChanged={handleMembershipChanged}
      />

      {/* CollectionSettingsModal removed */}
    </Container>
  );
}
