'use client';

import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  Check as CheckIcon,
  Visibility as ViewIcon,
  LibraryBooks as LibraryBooksIcon,
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
  IconButton,
  Tooltip,
  Badge,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { brandColors } from '@/theme/brandTokens';

import { InviteButton } from './InviteButton';
import { InviteFriendsModal } from './InviteFriendsModal';
import { VintageCheckoutCardDialog } from './VintageCheckoutCardDialog';

// Types
interface BranchItem {
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

interface BranchData {
  id: string;
  name: string;
  description?: string;
  location?: string;
  isPublic: boolean;
  owner: {
    id: string;
    name?: string;
    image?: string;
  };
  userRole: 'owner' | 'admin' | 'member' | null;
  memberCount: number;
  itemCount: number;
  itemsByCategory: Record<string, BranchItem[]>;
}

interface BranchDetailClientProps {
  branchId: string;
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

export function BranchDetailClient({ branchId }: BranchDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [branch, setBranch] = useState<BranchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutCardOpen, setCheckoutCardOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/branches/${branchId}`);
        if (!response.ok) {
          throw new Error('Failed to load branch');
        }

        const data = await response.json();
        setBranch(data.branch);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load branch');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranch();
  }, [branchId]);

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

  const handleNotifyWhenReturned = async (itemId: string) => {
    // TODO: Implement notification queue API
    console.log('Request notification for item:', itemId);
  };

  const handleShowCheckoutCard = (itemId: string, itemName: string) => {
    setSelectedItemId(itemId);
    setSelectedItemName(itemName);
    setCheckoutCardOpen(true);
  };

  const handleCloseCheckoutCard = () => {
    setCheckoutCardOpen(false);
    setSelectedItemId(null);
    setSelectedItemName(null);
  };

  const handleAskToBorrow = async (itemId: string) => {
    // Navigate to video selfie borrow request page
    router.push(`/borrow-request?item=${itemId}`);
  };

  const handleToggleUsing = async (
    itemId: string,
    isCurrentlyAvailable: boolean
  ) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isAvailable: !isCurrentlyAvailable,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Failed to toggle item availability'
        );
      }

      const { message } = await response.json();

      // Refresh branch data to show updated status
      const refreshResponse = await fetch(`/api/branches/${branchId}`);
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setBranch(refreshData.branch);
      }

      // Show success message
      console.log('✅', message);
    } catch (err) {
      console.error('Error toggling item availability:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to toggle item availability'
      );
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (
      !confirm(
        'Are you sure you want to remove this item from the branch? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove item');
      }

      const { message } = await response.json();

      // Refresh branch data to remove the item from the list
      const refreshResponse = await fetch(`/api/branches/${branchId}`);
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setBranch(refreshData.branch);
      }

      // Show success message
      console.log('✅', message);
    } catch (err) {
      console.error('Error removing item:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    }
  };

  const handleAddItem = (category?: string) => {
    // Navigate to camera-based add item flow
    const params = new URLSearchParams({
      branch: branchId,
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

  if (!branch) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="info">Branch not found</Alert>
      </Container>
    );
  }

  const categories = Object.keys(branch.itemsByCategory).sort();
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
          {branch.name}! 🎉
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton
          onClick={() => router.push('/lobby')}
          sx={{ mr: 2 }}
          aria-label="Back to lobby"
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {branch.name}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="body1" color="text.secondary">
              {branch.memberCount} members • {branch.itemCount} items
            </Typography>
            {branch.location && (
              <Typography variant="body2" color="text.secondary">
                📍 {branch.location}
              </Typography>
            )}
            <Chip
              label={branch.userRole || 'viewer'}
              size="small"
              color={branch.userRole === 'owner' ? 'primary' : 'default'}
            />
            {!branch.isPublic && (
              <Chip label="Private" size="small" variant="outlined" />
            )}
          </Box>
          {branch.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {branch.description}
            </Typography>
          )}
        </Box>

        {/* Branch Actions */}
        {(branch.userRole === 'owner' || branch.userRole === 'admin') && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <InviteButton
              onClick={() => setInviteModalOpen(true)}
              size="small"
            />
          </Box>
        )}
      </Box>

      {/* Add Item CTA */}
      {branch.userRole && (
        <Paper
          sx={{
            p: 3,
            mb: 4,
            bgcolor: brandColors.warmCream,
            border: `2px dashed ${brandColors.softGray}`,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" gutterBottom>
            Share something with your community
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add items to {branch.name} so others can borrow them
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleAddItem()}
            sx={{
              bgcolor: brandColors.inkBlue,
              '&:hover': { bgcolor: '#1a2f4f' },
            }}
          >
            Add Item
          </Button>
        </Paper>
      )}

      {/* Items by Category */}
      {hasItems ? (
        <Stack spacing={4}>
          {categories.map((categoryKey) => {
            const categoryConfig =
              CATEGORY_CONFIG[categoryKey as keyof typeof CATEGORY_CONFIG] ||
              CATEGORY_CONFIG.other;
            const items = branch.itemsByCategory[categoryKey];

            return (
              <Card key={categoryKey}>
                <CardContent>
                  {/* Category Header */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      mb: 3,
                      gap: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant="h2"
                        sx={{
                          fontSize: { xs: '1.25rem', sm: '1.5rem' },
                          mr: 0.5,
                        }}
                      >
                        {categoryConfig.icon}
                      </Typography>
                      <Typography
                        variant="h5"
                        component="h2"
                        sx={{
                          fontSize: { xs: '1.1rem', sm: '1.25rem' },
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {categoryConfig.name}
                      </Typography>
                      <Chip label={items?.length || 0} size="small" />
                    </Box>
                    {branch.userRole && (
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{
                          flexShrink: 0,
                          minWidth: { xs: 'auto', sm: 'auto' },
                          px: { xs: 1, sm: 2 },
                        }}
                        onClick={() => handleAddItem(categoryKey)}
                      >
                        <AddIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                        <Box
                          component="span"
                          sx={{ display: { xs: 'none', sm: 'inline' }, ml: 1 }}
                        >
                          Add {categoryConfig.name.split(' & ')[0]}
                        </Box>
                      </Button>
                    )}
                  </Box>

                  {/* Items Grid */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                      },
                      gap: 2,
                    }}
                  >
                    {items?.map((item) => (
                      <Card
                        key={item.id}
                        variant="outlined"
                        sx={{ height: '100%' }}
                      >
                        <CardContent
                          sx={{
                            p: 2,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          {/* Item Header */}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              mb: 2,
                            }}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="h6"
                                component="h3"
                                sx={{
                                  fontSize: '1rem',
                                  fontWeight: 500,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.name}
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  mt: 0.5,
                                }}
                              >
                                <Avatar sx={{ width: 20, height: 20 }}>
                                  <PersonIcon sx={{ fontSize: 12 }} />
                                </Avatar>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {item.owner.name}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Status Indicator */}
                            {item.currentBorrow ? (
                              <Tooltip
                                title={`Due ${new Date(item.currentBorrow.dueDate).toLocaleDateString()}`}
                              >
                                <Chip
                                  label="Checked Out"
                                  size="small"
                                  color="warning"
                                  sx={{ ml: 1 }}
                                />
                              </Tooltip>
                            ) : (
                              <Chip
                                label="Available"
                                size="small"
                                color="success"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>

                          {/* Item Image */}
                          <Box
                            sx={{
                              aspectRatio: '1',
                              bgcolor: 'grey.100',
                              borderRadius: 1,
                              mb: 2,
                              overflow: 'hidden',
                              position: 'relative',
                            }}
                          >
                            {item.imageUrl ? (
                              <>
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                    filter: !item.isAvailable
                                      ? 'grayscale(100%)'
                                      : 'none',
                                    transition: 'filter 0.3s ease',
                                  }}
                                />
                                {/* Owner Avatar Overlay for checked out items */}
                                {!item.isAvailable && (
                                  <Avatar
                                    src={item.owner?.image ?? undefined}
                                    onClick={() =>
                                      router.push(`/profile/${item.owner?.id}`)
                                    }
                                    sx={{
                                      position: 'absolute',
                                      top: 4,
                                      right: 4,
                                      width: 24,
                                      height: 24,
                                      cursor: 'pointer',
                                      border: '1px solid white',
                                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                                      fontSize: '0.7rem',
                                      '&:hover': {
                                        transform: 'scale(1.1)',
                                        transition: 'transform 0.2s ease',
                                      },
                                    }}
                                  >
                                    {!item.owner?.image &&
                                      item.owner?.name?.[0]}
                                  </Avatar>
                                )}
                              </>
                            ) : (
                              <Box
                                sx={{
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  No Image
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          {/* Item Description */}
                          {item.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                mb: 2,
                                overflow: 'hidden',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {item.description}
                            </Typography>
                          )}

                          {/* Current Borrow Info */}
                          {item.currentBorrow && (
                            <Box
                              sx={{
                                mb: 2,
                                p: 1,
                                borderRadius: 1,
                                bgcolor: 'rgba(255, 152, 0, 0.1)',
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 500 }}
                              >
                                Borrowed by {item.currentBorrow.borrower.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                display="block"
                                color="text.secondary"
                              >
                                Due:{' '}
                                {new Date(
                                  item.currentBorrow.dueDate
                                ).toLocaleDateString()}
                              </Typography>
                            </Box>
                          )}

                          {/* Actions */}
                          <Box
                            sx={{
                              mt: 'auto',
                              display: 'flex',
                              gap: 1,
                              flexWrap: 'wrap',
                            }}
                          >
                            {item.isOwnedByUser ? (
                              // Owner Actions
                              <>
                                <Button
                                  size="small"
                                  variant={
                                    item.isAvailable ? 'outlined' : 'contained'
                                  }
                                  color={
                                    item.isAvailable ? 'warning' : 'success'
                                  }
                                  startIcon={
                                    item.isAvailable ? (
                                      <ScheduleIcon />
                                    ) : (
                                      <CheckIcon />
                                    )
                                  }
                                  onClick={() =>
                                    handleToggleUsing(item.id, item.isAvailable)
                                  }
                                >
                                  {item.isAvailable
                                    ? 'Mark Using'
                                    : 'Mark Available'}
                                </Button>
                                <Tooltip title="View details">
                                  <IconButton
                                    size="small"
                                    component={Link}
                                    href={`/stuff/${item.id}`}
                                  >
                                    <ViewIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Remove from branch">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleRemoveItem(item.id)}
                                  >
                                    <CloseIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="View checkout history">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleShowCheckoutCard(item.id, item.name)
                                    }
                                  >
                                    <LibraryBooksIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            ) : (
                              // Non-owner Actions
                              <>
                                {item.currentBorrow ? (
                                  // Item is checked out
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={
                                      <Badge
                                        badgeContent={item.queueDepth}
                                        color="primary"
                                      >
                                        <NotificationsIcon />
                                      </Badge>
                                    }
                                    onClick={() =>
                                      handleNotifyWhenReturned(item.id)
                                    }
                                  >
                                    Notify When Returned
                                  </Button>
                                ) : (
                                  // Item is available
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => handleAskToBorrow(item.id)}
                                    sx={{ bgcolor: brandColors.inkBlue }}
                                  >
                                    Ask to Borrow
                                  </Button>
                                )}
                                <Tooltip title="View details">
                                  <IconButton
                                    size="small"
                                    component={Link}
                                    href={`/stuff/${item.id}`}
                                  >
                                    <ViewIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="View checkout history">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleShowCheckoutCard(item.id, item.name)
                                    }
                                  >
                                    <LibraryBooksIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>

                          {/* Queue Info */}
                          {item.queueDepth > 0 && (
                            <Tooltip
                              title={
                                <Box>
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 500 }}
                                  >
                                    Notification Queue:
                                  </Typography>
                                  {item.notificationQueue
                                    .slice(0, 3)
                                    .map((queueItem, index) => (
                                      <Typography
                                        key={queueItem.id}
                                        variant="caption"
                                        display="block"
                                      >
                                        {index + 1}. {queueItem.user.name}
                                      </Typography>
                                    ))}
                                  {item.notificationQueue.length > 3 && (
                                    <Typography
                                      variant="caption"
                                      display="block"
                                    >
                                      +{item.notificationQueue.length - 3} more
                                    </Typography>
                                  )}
                                </Box>
                              }
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mt: 1, cursor: 'help' }}
                              >
                                {item.queueDepth} in notification queue
                              </Typography>
                            </Tooltip>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      ) : (
        // Empty State
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            No items in {branch.name} yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Be the first to add items for your community to share!
          </Typography>
          {branch.userRole && (
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

      {/* Invite Friends Modal */}
      <InviteFriendsModal
        branchId={branchId}
        branchName={branch?.name || ''}
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </Container>
  );
}
