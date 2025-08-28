'use client';

import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  PersonAdd as PersonAddIcon,
  History as HistoryIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Paper,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Snackbar,
  IconButton,
  Avatar,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

import { useBorrowHistory } from '@/hooks/useBorrowHistory';
import { useBorrowRequests } from '@/hooks/useBorrowRequests';
import { useLibraries } from '@/hooks/useLibraries';

import { VintageCheckoutCard } from './VintageCheckoutCard';

interface ItemData {
  id: string;
  name: string;
  description?: string;
  condition: string;
  location?: string;
  imageUrl?: string;
  isAvailable: boolean;
  createdAt: string;
  owner: {
    id: string;
    name?: string;
    image?: string;
  };
  stuffType?: {
    displayName: string;
    category: string;
    iconPath: string;
  };
}

interface ItemDetailClientProps {
  itemId: string;
  isNewItem?: boolean;
}

export function ItemDetailClient({
  itemId,
  isNewItem = false,
}: ItemDetailClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [item, setItem] = useState<ItemData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state for editing
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('good');
  const [location, setLocation] = useState('');
  const [_editMode, _setEditMode] = useState(false);
  const [selectedLibraries, setSelectedLibraries] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  // Store original values for cancel functionality
  const [originalValues, setOriginalValues] = useState({
    name: '',
    description: '',
    condition: 'good',
    location: '',
  });

  // Hooks
  const { data: borrowHistory } = useBorrowHistory(isNewItem ? '' : itemId);
  const { receivedRequests } = useBorrowRequests();
  const { libraries } = useLibraries();

  // Filter pending requests for this specific item
  const pendingRequests = receivedRequests.filter(
    (req) => req.item.id === itemId && req.status === 'pending'
  );

  const conditions = [
    { value: 'excellent', label: 'Excellent - Like new' },
    { value: 'good', label: 'Good - Minor wear' },
    { value: 'fair', label: 'Fair - Shows use' },
    { value: 'poor', label: 'Poor - Needs repair' },
  ];

  // Get current user ID
  const currentUserId = (session?.user as any)?.id;

  // Handle borrow request
  const handleBorrowRequest = () => {
    router.push(`/borrow-request?item=${itemId}`);
  };

  // Handle take offline/online item
  const handleToggleOffline = async () => {
    if (!item) return;

    const isTakingOnline = !item.isAvailable;
    setCheckingOut(true);

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isAvailable: isTakingOnline ? true : false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to take item ${isTakingOnline ? 'online' : 'offline'}`
        );
      }

      const data = await response.json();
      setItem(data.item);

      setToast({
        open: true,
        message: `"${item.name}" has been taken ${isTakingOnline ? 'online' : 'offline'}`,
      });
    } catch (err) {
      console.error(
        `Error taking item ${isTakingOnline ? 'online' : 'offline'}:`,
        err
      );
      setError(
        err instanceof Error
          ? err.message
          : `Failed to take item ${isTakingOnline ? 'online' : 'offline'}`
      );
    } finally {
      setCheckingOut(false);
    }
  };

  // Handle delete item
  const handleDelete = async () => {
    if (
      !item ||
      !window.confirm(
        `Are you sure you want to delete "${item.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }

      setToast({
        open: true,
        message: `"${item.name}" has been deleted`,
      });

      // Navigate back to inventory after deletion
      setTimeout(() => {
        router.push(`/stuff/m/${currentUserId}`);
      }, 1500);
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  // Check if user can borrow this item
  const canBorrow =
    !isNewItem &&
    item &&
    currentUserId &&
    item.owner.id !== currentUserId &&
    item.isAvailable;

  // Ensure client-side hydration is complete
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch item data
  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await fetch(`/api/items/${itemId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch item');
        }

        const data = await response.json();
        setItem(data.item);

        // Initialize form fields
        const itemData = {
          name: data.item.name || '',
          description: data.item.description || '',
          condition: data.item.condition || 'good',
          location: data.item.location || '',
        };

        setName(itemData.name);
        setDescription(itemData.description);
        setCondition(itemData.condition);
        setLocation(itemData.location);
        setOriginalValues(itemData);
      } catch (err) {
        console.error('Error fetching item:', err);
        setError('Failed to load item details');
      } finally {
        setLoading(false);
      }
    };

    // Fetch item data regardless - even "new" items exist in the database
    fetchItem();
  }, [itemId, isNewItem]);

  // Save item updates
  const handleSave = async (field?: string, silent = false) => {
    if (!item) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          condition,
          location: location.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      const data = await response.json();
      setItem(data.item);

      // Update original values and exit edit mode
      const newOriginalValues = {
        name: data.item.name || '',
        description: data.item.description || '',
        condition: data.item.condition || 'good',
        location: data.item.location || '',
      };
      setOriginalValues(newOriginalValues);
      _setEditMode(false);

      // Show toast if not silent
      if (!silent) {
        setToast({
          open: true,
          message: field ? `${field} updated` : 'Item updated successfully',
        });
      }

      // Navigate to lobby after saving new item
      if (isNewItem) {
        router.push('/lobby');
      }
    } catch (err) {
      console.error('Error saving item:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Handle library membership updates
  const handleLibraryMembershipUpdate = async (libraryIds: string[]) => {
    if (!item) return;

    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          libraryIds: libraryIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update library membership');
      }

      setToast({
        open: true,
        message: 'Library membership updated successfully',
      });
    } catch (err) {
      console.error('Error updating library membership:', err);
      setToast({
        open: true,
        message: 'Failed to update library membership',
      });
    }
  };

  // Auto-save on blur for individual fields
  const handleFieldBlur = async (
    field: string,
    value: string,
    originalValue: string
  ) => {
    if (
      value.trim() !== originalValue &&
      !isNewItem &&
      item?.owner.id === currentUserId
    ) {
      await handleSave(field, false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error && !item) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container
      maxWidth="md"
      sx={{
        py: 4,
        pb: { xs: 8, sm: 4 }, // Extra bottom padding on mobile for viewport
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h5" component="h1">
          {isNewItem ? 'Complete Item Details' : 'Item Details'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Item Content */}
      {item && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 4,
          }}
        >
          {/* Image */}
          {item.imageUrl && (
            <Box sx={{ flex: '0 0 300px' }}>
              <Paper
                elevation={3}
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  aspectRatio: '1',
                  position: 'relative',
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: !item.isAvailable ? 'grayscale(100%)' : 'none',
                    transition: 'filter 0.3s ease',
                  }}
                />
                {/* Owner Avatar Overlay for checked out items */}
                {!item.isAvailable && (
                  <Avatar
                    {...(item.owner.image && { src: item.owner.image })}
                    onClick={() => router.push(`/profile/${item.owner.id}`)}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 40,
                      height: 40,
                      cursor: 'pointer',
                      border: '2px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        transition: 'transform 0.2s ease',
                      },
                    }}
                  >
                    {!item.owner.image && item.owner.name?.[0]}
                  </Avatar>
                )}
              </Paper>
            </Box>
          )}

          {/* Flippable Details Card */}
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                position: 'relative',
                perspective: '1000px',
                minHeight: '625px',
              }}
            >
              {/* Card Container with 3D Transform */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  transformStyle: 'preserve-3d',
                  WebkitTransformStyle: 'preserve-3d', // Safari-specific
                  transition: 'transform 0.6s ease-in-out',
                  WebkitTransition: 'transform 0.6s ease-in-out', // Safari-specific
                  transform: isClient
                    ? showHistory
                      ? 'rotateY(180deg)'
                      : 'rotateY(0deg)'
                    : 'rotateY(0deg)', // Always start front-facing during SSR/hydration
                }}
              >
                {/* Front Side - Item Details */}
                <Card
                  sx={{
                    position: 'absolute',
                    width: '100%',
                    height: { xs: 'auto', md: '625px' },
                    minHeight: { xs: '500px', md: '625px' },
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden', // Safari-specific
                    opacity: !isClient || !showHistory ? 1 : 0, // Fallback visibility control
                    zIndex: !isClient || !showHistory ? 2 : 1, // Ensure front is on top when not flipped
                    transition: 'opacity 0.3s ease-in-out',
                  }}
                >
                  <CardContent
                    sx={{ p: { xs: 2, md: 3 }, position: 'relative' }}
                  >
                    {/* Flip Button */}
                    {!isNewItem && item?.owner.id === currentUserId && (
                      <IconButton
                        onClick={() => setShowHistory(true)}
                        sx={{
                          position: 'absolute',
                          top: { xs: 4, md: 8 },
                          right: { xs: 4, md: 8 },
                          backgroundColor: 'rgba(0,0,0,0.05)',
                          '&:hover': { backgroundColor: 'rgba(0,0,0,0.1)' },
                          zIndex: 1,
                        }}
                      >
                        <HistoryIcon />
                      </IconButton>
                    )}

                    {isNewItem && (
                      <Alert severity="info" sx={{ mb: 3 }}>
                        Great! We&apos;ve identified your item. Please review
                        and complete the details below.
                      </Alert>
                    )}

                    <Box
                      sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
                    >
                      {/* Item Name */}
                      <TextField
                        fullWidth
                        label="Item Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() =>
                          handleFieldBlur('Name', name, originalValues.name)
                        }
                        disabled={
                          isNewItem ? false : item?.owner.id !== currentUserId
                        }
                        variant="outlined"
                        required
                      />

                      {/* Description */}
                      <TextField
                        fullWidth
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={() =>
                          handleFieldBlur(
                            'Description',
                            description,
                            originalValues.description
                          )
                        }
                        disabled={
                          isNewItem ? false : item?.owner.id !== currentUserId
                        }
                        variant="outlined"
                        multiline
                        rows={4}
                        placeholder="Add any additional details, brand, model, or special features..."
                      />

                      {/* Condition */}
                      <FormControl
                        fullWidth
                        disabled={
                          isNewItem ? false : item?.owner.id !== currentUserId
                        }
                      >
                        <InputLabel>Condition</InputLabel>
                        <Select
                          value={condition}
                          label="Condition"
                          onChange={(e) => {
                            setCondition(e.target.value);
                            if (
                              !isNewItem &&
                              item?.owner.id === currentUserId
                            ) {
                              setTimeout(
                                () =>
                                  handleFieldBlur(
                                    'Condition',
                                    e.target.value,
                                    originalValues.condition
                                  ),
                                100
                              );
                            }
                          }}
                        >
                          {conditions.map((cond) => (
                            <MenuItem key={cond.value} value={cond.value}>
                              {cond.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Location */}
                      <TextField
                        fullWidth
                        label="Location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        onBlur={() =>
                          handleFieldBlur(
                            'Location',
                            location,
                            originalValues.location
                          )
                        }
                        disabled={
                          isNewItem ? false : item?.owner.id !== currentUserId
                        }
                        variant="outlined"
                        placeholder="e.g., garage, kitchen, basement"
                        helperText="Where is this item stored?"
                      />

                      {/* Save Button for Mobile - only for new items */}
                      {isNewItem && (
                        <Box sx={{ mt: 3, mb: 3, textAlign: 'center' }}>
                          <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            onClick={() =>
                              router.push(`/stuff/m/${currentUserId}`)
                            }
                            sx={{
                              backgroundColor: '#4CAF50',
                              '&:hover': { backgroundColor: '#45a049' },
                              textTransform: 'none',
                              px: 4,
                              py: 1.5,
                              fontSize: '1rem',
                              fontWeight: 600,
                            }}
                          >
                            Add Item & Go to Inventory
                          </Button>
                        </Box>
                      )}

                      {/* Category and Owner Row */}
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                          gap: 3,
                        }}
                      >
                        {/* Category Display */}
                        {item.stuffType && (
                          <Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              gutterBottom
                            >
                              Category
                            </Typography>
                            <Typography
                              variant="body1"
                              sx={{ textTransform: 'capitalize' }}
                            >
                              {item.stuffType.category}
                            </Typography>
                          </Box>
                        )}

                        {/* Owner Info (if not new item) */}
                        {!isNewItem && item.owner && (
                          <Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              gutterBottom
                            >
                              Owner
                            </Typography>
                            <Typography variant="body1">
                              {item.owner.name || 'Unknown'}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Pending Requests (if user owns item and there are pending requests) */}
                      {!isNewItem &&
                        item?.owner.id === currentUserId &&
                        pendingRequests.length > 0 && (
                          <Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              gutterBottom
                            >
                              Pending Requests
                            </Typography>
                            <Box
                              sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                              }}
                            >
                              {pendingRequests.map((request) => (
                                <Alert
                                  key={request.id}
                                  severity="info"
                                  sx={{ py: 1 }}
                                >
                                  <Typography variant="body2">
                                    <strong>
                                      {request.borrower?.name || 'Someone'}
                                    </strong>{' '}
                                    wants to borrow this item
                                    {request.promisedReturnBy && (
                                      <span>
                                        {' '}
                                        - promised return:{' '}
                                        {new Date(
                                          request.promisedReturnBy
                                        ).toLocaleDateString()}
                                      </span>
                                    )}
                                  </Typography>
                                  {request.promiseText && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        display: 'block',
                                        mt: 0.5,
                                        fontStyle: 'italic',
                                      }}
                                    >
                                      &ldquo;{request.promiseText}&rdquo;
                                    </Typography>
                                  )}
                                </Alert>
                              ))}
                            </Box>
                          </Box>
                        )}

                      {/* Save Button (only for new items) */}
                      {isNewItem && (
                        <Box sx={{ pt: 2 }}>
                          <Button
                            variant="contained"
                            size="large"
                            startIcon={
                              saving ? (
                                <CircularProgress size={20} />
                              ) : (
                                <SaveIcon />
                              )
                            }
                            onClick={() => handleSave()}
                            disabled={saving || !name.trim()}
                            sx={{ borderRadius: 2 }}
                          >
                            {saving ? 'Saving...' : 'Add to Library'}
                          </Button>
                        </Box>
                      )}

                      {/* Borrow Request Button */}
                      {canBorrow && (
                        <Box sx={{ pt: 2 }}>
                          <Button
                            variant="contained"
                            size="large"
                            startIcon={<PersonAddIcon />}
                            onClick={handleBorrowRequest}
                            sx={{
                              borderRadius: 2,
                              bgcolor: 'primary.main',
                              '&:hover': { bgcolor: 'primary.dark' },
                            }}
                          >
                            Request to Borrow
                          </Button>
                        </Box>
                      )}

                      {/* Action Buttons Row - only for owners */}
                      {!isNewItem && item?.owner.id === currentUserId && (
                        <Box
                          sx={{
                            pt: 2,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          {/* Take Offline/Online Button */}
                          <Button
                            variant={
                              item?.isAvailable ? 'outlined' : 'contained'
                            }
                            color={item?.isAvailable ? 'warning' : 'success'}
                            size="large"
                            startIcon={
                              checkingOut ? (
                                <CircularProgress size={20} />
                              ) : (
                                <CheckIcon />
                              )
                            }
                            onClick={handleToggleOffline}
                            disabled={checkingOut}
                            sx={{
                              borderRadius: 2,
                              textTransform: 'none',
                            }}
                          >
                            {checkingOut
                              ? item?.isAvailable
                                ? 'Taking Offline...'
                                : 'Taking Online...'
                              : item?.isAvailable
                                ? 'Take Offline'
                                : 'Take Online'}
                          </Button>

                          {/* Delete Button - only for available items */}
                          {item?.isAvailable && (
                            <Button
                              variant="outlined"
                              color="error"
                              size="large"
                              startIcon={
                                deleting ? (
                                  <CircularProgress size={20} />
                                ) : (
                                  <DeleteIcon />
                                )
                              }
                              onClick={handleDelete}
                              disabled={deleting}
                              sx={{
                                borderRadius: 2,
                                borderColor: 'error.main',
                                color: 'error.main',
                                '&:hover': {
                                  bgcolor: 'error.main',
                                  color: 'white',
                                },
                              }}
                            >
                              {deleting ? 'Deleting...' : 'Delete Item'}
                            </Button>
                          )}
                        </Box>
                      )}

                      {/* Availability warning for non-owners */}
                      {!isNewItem &&
                        !canBorrow &&
                        item?.owner.id !== currentUserId &&
                        !item?.isAvailable && (
                          <Alert severity="warning" sx={{ mt: 2 }}>
                            This item is currently not available for borrowing.
                          </Alert>
                        )}
                    </Box>
                  </CardContent>
                </Card>

                {/* Back Side - Vintage Library Card */}
                <Card
                  sx={{
                    position: 'absolute',
                    width: '100%',
                    height: { xs: 'auto', md: '625px' },
                    minHeight: { xs: '500px', md: '625px' },
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden', // Safari-specific
                    transform: 'rotateY(180deg)',
                    opacity: isClient && showHistory ? 1 : 0, // Fallback visibility control
                    zIndex: isClient && showHistory ? 2 : 1, // Ensure back is on top when flipped
                    transition: 'opacity 0.3s ease-in-out',
                    backgroundColor: '#f9f7f4',
                    border: '1px solid rgba(139,69,19,0.2)',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `
                        radial-gradient(circle at 20% 30%, rgba(139,69,19,0.05) 1px, transparent 1px),
                        radial-gradient(circle at 80% 70%, rgba(160,82,45,0.03) 1px, transparent 1px),
                        radial-gradient(circle at 40% 80%, rgba(101,67,33,0.04) 1px, transparent 1px),
                        linear-gradient(to bottom, transparent 0%, rgba(139,69,19,0.02) 100%)
                      `,
                      pointerEvents: 'none',
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      p: 3,
                      position: 'relative',
                      height: '100%',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Flip Back Button */}
                    <IconButton
                      onClick={() => setShowHistory(false)}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(0,0,0,0.05)',
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.1)' },
                        zIndex: 10,
                      }}
                    >
                      <InfoIcon />
                    </IconButton>

                    {/* Library Card Header */}
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                      <Typography
                        className="vintage-impact-label"
                        sx={{
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          letterSpacing: '2px',
                          color: '#2c1810',
                          textTransform: 'uppercase',
                        }}
                      >
                        ★ LIBRARY CHECKOUT CARD ★
                      </Typography>
                      <Box
                        sx={{
                          width: '100%',
                          height: '2px',
                          bgcolor: '#8b4513',
                          mt: 1,
                          opacity: 0.6,
                        }}
                      />
                    </Box>

                    {/* Checkout Grid */}
                    <Box sx={{ mt: 2 }}>
                      {/* Header Row */}
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 100px 100px',
                          gap: 1,
                          mb: 2,
                          pb: 1,
                          borderBottom: '2px solid #8b4513',
                          opacity: 0.8,
                        }}
                      >
                        <Typography
                          className="vintage-stampette"
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: '#2c1810',
                            textAlign: 'center',
                          }}
                        >
                          BORROWER&apos;S NAME
                        </Typography>
                        <Typography
                          className="vintage-stampette"
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: '#2c1810',
                            textAlign: 'center',
                          }}
                        >
                          DUE DATE
                        </Typography>
                        <Typography
                          className="vintage-stampette"
                          sx={{
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            color: '#2c1810',
                            textAlign: 'center',
                          }}
                        >
                          RETURNED
                        </Typography>
                      </Box>

                      {/* Actual History or Empty Rows */}
                      {borrowHistory &&
                      borrowHistory.borrowHistory.length > 0 ? (
                        <VintageCheckoutCard
                          itemName={borrowHistory.itemName}
                          borrowHistory={borrowHistory.borrowHistory}
                          compact={true}
                          showTitle={false}
                        />
                      ) : (
                        // Empty checkout rows
                        <>
                          {Array.from({ length: 14 }).map((_, index) => (
                            <Box
                              key={index}
                              sx={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 100px 100px',
                                gap: 1,
                                mb: 1.5,
                                height: '20px',
                                borderBottom: '1px solid #8b4513',
                                opacity: 0.3,
                              }}
                            >
                              <Box />
                              <Box />
                              <Box />
                            </Box>
                          ))}
                        </>
                      )}
                    </Box>

                    {/* Bottom Library Mark */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 16,
                        right: 24,
                        textAlign: 'center',
                        opacity: 0.5,
                        transform: 'rotate(-2deg)',
                      }}
                    >
                      <Typography
                        className="vintage-impact-label"
                        sx={{
                          fontSize: '0.7rem',
                          color: '#8b4513',
                          letterSpacing: '1px',
                        }}
                      >
                        stuffLIBRARY
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>

            {/* Library Membership (heading aligned left, checkboxes aligned right on desktop) */}
            {!isNewItem &&
              item?.owner.id === currentUserId &&
              libraries.length > 0 && (
                <Box sx={{ mt: { xs: 8, md: 3 } }}>
                  <Typography
                    variant="h6"
                    sx={{
                      mb: 2,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: 'text.primary',
                    }}
                  >
                    Visible in following libraries:
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',
                    }}
                  >
                    <Box>
                      {/* Availability warning if item is not available */}
                      {!item?.isAvailable && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Library membership can only be edited when the item is
                          available.
                        </Alert>
                      )}

                      <FormGroup sx={{ ml: 1 }}>
                        {libraries.map((library) => (
                          <FormControlLabel
                            key={library.id}
                            control={
                              <Checkbox
                                checked={selectedLibraries.includes(library.id)}
                                onChange={(e) => {
                                  const newSelectedLibraries = e.target.checked
                                    ? [...selectedLibraries, library.id]
                                    : selectedLibraries.filter(
                                        (id) => id !== library.id
                                      );

                                  setSelectedLibraries(newSelectedLibraries);
                                  handleLibraryMembershipUpdate(
                                    newSelectedLibraries
                                  );
                                }}
                                disabled={!item?.isAvailable}
                                sx={{
                                  color: 'primary.main',
                                  '&.Mui-checked': {
                                    color: 'primary.main',
                                  },
                                }}
                              />
                            }
                            label={
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 500,
                                    color: !item?.isAvailable
                                      ? 'text.disabled'
                                      : 'text.primary',
                                  }}
                                >
                                  {library.name}
                                </Typography>
                                {library.location && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: !item?.isAvailable
                                        ? 'text.disabled'
                                        : 'text.secondary',
                                    }}
                                  >
                                    📍 {library.location}
                                  </Typography>
                                )}
                              </Box>
                            }
                            sx={{ mb: 0.5 }}
                          />
                        ))}
                      </FormGroup>

                      {selectedLibraries.length === 0 && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontStyle: 'italic', mt: 1, ml: 1 }}
                        >
                          Not visible in any libraries yet
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              )}
          </Box>
        </Box>
      )}

      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast({ open: false, message: '' })}
        message={toast.message}
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={() => setToast({ open: false, message: '' })}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Container>
  );
}
