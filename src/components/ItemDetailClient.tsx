'use client';

import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import { useRouter } from 'next/navigation';

interface ItemDetailClientProps {
  itemId: string;
}

export function ItemDetailClient({ itemId }: ItemDetailClientProps) {
  const router = useRouter();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Item Details
        </Typography>
      </Box>

      {/* Placeholder Content */}
      <Card>
        <CardContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Item detail page is a placeholder and will be implemented in a
            future milestone.
          </Alert>

          <Typography variant="h6" gutterBottom>
            Item ID: {itemId}
          </Typography>

          <Typography variant="body1" color="text.secondary">
            This page will show detailed information about the item including:
          </Typography>

          <Box component="ul" sx={{ mt: 2, pl: 2 }}>
            <Typography component="li" variant="body2">
              High-resolution images
            </Typography>
            <Typography component="li" variant="body2">
              Detailed description and condition
            </Typography>
            <Typography component="li" variant="body2">
              Owner information and contact
            </Typography>
            <Typography component="li" variant="body2">
              Borrow history and availability
            </Typography>
            <Typography component="li" variant="body2">
              Reviews and ratings
            </Typography>
            <Typography component="li" variant="body2">
              Location and pickup instructions
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
