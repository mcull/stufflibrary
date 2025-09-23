'use client';

import {
  ArrowBack as ArrowBackIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Stack,
  Alert,
} from '@mui/material';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

import { useUserItems } from '@/hooks/useUserItems';
import { brandColors } from '@/theme/brandTokens';

interface LibraryInfo {
  id: string;
  name: string;
  description?: string;
}

export default function AddToLibraryPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const libraryId = params.libraryId as string;

  const [library, setLibrary] = useState<LibraryInfo | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    readyToLendItems,
    isLoading: itemsLoading,
    error: itemsError,
  } = useUserItems();

  // Fetch library info
  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await fetch(`/api/collections/${libraryId}`);
        if (!response.ok) {
          throw new Error('Failed to load library');
        }
        const data = await response.json();
        setLibrary(data.collection);
      } catch (err) {
        console.error('Error fetching library:', err);
        setError('Failed to load library information');
      }
    };

    if (libraryId) {
      fetchLibrary();
    }
  }, [libraryId]);

  // Available items (those not currently borrowed)
  const availableItems = [...readyToLendItems].filter(
    (item) => !(item as any).currentBorrowRequestId
  );

  const handleItemToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) newSelected.delete(itemId);
    else newSelected.add(itemId);
    setSelectedItems(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedItems.size === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const promises = Array.from(selectedItems).map((itemId) =>
        fetch(`/api/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addLibraryIds: [libraryId] }),
        })
      );
      await Promise.all(promises);
      router.push(
        `/library/${libraryId}?message=items_added&count=${selectedItems.size}`
      );
    } catch (err) {
      console.error('Error adding items to library:', err);
      setError('Failed to add items to library');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  if (itemsLoading || !library) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={48} />
      </Container>
    );
  }

  if (error || itemsError) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || itemsError}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()}>
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push(`/library/${libraryId}`)}
          sx={{ mr: 2 }}
        >
          Back to {library.name}
        </Button>
      </Box>

      <Typography variant="h4" component="h1" gutterBottom>
        Add Items to {library.name}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Select items from your inventory to share in this library. Only
        available items can be added.
      </Typography>

      {availableItems.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" gutterBottom>
            No available items to share
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            All your items are either already shared or currently unavailable.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              onClick={() => router.push('/add-item')}
              sx={{
                bgcolor: brandColors.inkBlue,
                '&:hover': { bgcolor: '#1a2f4f' },
              }}
            >
              Create New Item
            </Button>
            <Button
              variant="outlined"
              onClick={() => router.push(`/library/${libraryId}`)}
            >
              Back to Library
            </Button>
          </Stack>
        </Box>
      ) : (
        <>
          {/* Selection Summary */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedItems.size} of {availableItems.length} items selected
            </Typography>
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
              },
              gap: 2,
              mb: 4,
            }}
          >
            {availableItems.map((item) => (
              <Card
                key={item.id}
                sx={{
                  position: 'relative',
                  cursor: 'pointer',
                  border: selectedItems.has(item.id)
                    ? `2px solid ${brandColors.inkBlue}`
                    : '1px solid transparent',
                  '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
                }}
                onClick={() => handleItemToggle(item.id)}
              >
                <CardContent sx={{ p: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => e.stopPropagation()}
                        sx={{ position: 'absolute', top: 8, right: 8, p: 0.5 }}
                      />
                    }
                    label=""
                    sx={{ position: 'absolute', top: 0, right: 0, m: 0 }}
                  />
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '1',
                      backgroundColor: 'grey.100',
                      borderRadius: 1,
                      mb: 2,
                      overflow: 'hidden',
                    }}
                  >
                    {item.watercolorThumbUrl || item.imageUrl ? (
                      <Image
                        src={(item.watercolorThumbUrl || item.imageUrl)!}
                        alt={item.name}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="h3" sx={{ opacity: 0.5 }}>
                          📦
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      mb: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.name}
                  </Typography>
                  <Chip
                    label={item.condition || 'Good'}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Button
              variant="outlined"
              onClick={() => router.push(`/library/${libraryId}`)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={selectedItems.size === 0 || isSubmitting}
              startIcon={
                isSubmitting ? <CircularProgress size={20} /> : <CheckIcon />
              }
              sx={{
                bgcolor: brandColors.inkBlue,
                '&:hover': { bgcolor: '#1a2f4f' },
              }}
            >
              {isSubmitting
                ? 'Adding Items...'
                : `Add ${selectedItems.size} Item${selectedItems.size === 1 ? '' : 's'}`}
            </Button>
          </Box>
        </>
      )}
    </Container>
  );
}
