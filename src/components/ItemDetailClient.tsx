'use client';

import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
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
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface ItemData {
  id: string;
  name: string;
  description?: string;
  condition: string;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState<ItemData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state for editing
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [condition, setCondition] = useState('good');

  const conditions = [
    { value: 'excellent', label: 'Excellent - Like new' },
    { value: 'good', label: 'Good - Minor wear' },
    { value: 'fair', label: 'Fair - Shows use' },
    { value: 'poor', label: 'Poor - Needs repair' },
  ];

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
        setName(data.item.name || '');
        setDescription(data.item.description || '');
        setCondition(data.item.condition || 'good');
      } catch (err) {
        console.error('Error fetching item:', err);
        setError('Failed to load item details');
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [itemId]);

  // Save item updates
  const handleSave = async () => {
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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      const data = await response.json();
      setItem(data.item);

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
    <Container maxWidth="md" sx={{ py: 4 }}>
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
                  }}
                />
              </Paper>
            </Box>
          )}

          {/* Details Form */}
          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                {isNewItem && (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Great! We&apos;ve identified your item. Please review and
                    complete the details below.
                  </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Item Name */}
                  <TextField
                    fullWidth
                    label="Item Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isNewItem}
                    variant="outlined"
                    required
                  />

                  {/* Description */}
                  <TextField
                    fullWidth
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!isNewItem}
                    variant="outlined"
                    multiline
                    rows={4}
                    placeholder="Add any additional details, brand, model, or special features..."
                  />

                  {/* Condition */}
                  <FormControl fullWidth disabled={!isNewItem}>
                    <InputLabel>Condition</InputLabel>
                    <Select
                      value={condition}
                      label="Condition"
                      onChange={(e) => setCondition(e.target.value)}
                    >
                      {conditions.map((cond) => (
                        <MenuItem key={cond.value} value={cond.value}>
                          {cond.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

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

                  {/* Save Button (only for new items) */}
                  {isNewItem && (
                    <Box sx={{ pt: 2 }}>
                      <Button
                        variant="contained"
                        size="large"
                        startIcon={
                          saving ? <CircularProgress size={20} /> : <SaveIcon />
                        }
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        sx={{ borderRadius: 2 }}
                      >
                        {saving ? 'Saving...' : 'Add to Library'}
                      </Button>
                    </Box>
                  )}

                  {/* Placeholder message for non-editable items */}
                  {!isNewItem && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Full item details and borrowing functionality will be
                      implemented in a future milestone.
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}
    </Container>
  );
}
