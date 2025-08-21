'use client';

import { Close as CloseIcon } from '@mui/icons-material';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  CircularProgress,
  Typography,
  Alert,
} from '@mui/material';

import { useBorrowHistory } from '@/hooks/useBorrowHistory';

import { VintageCheckoutCard } from './VintageCheckoutCard';

interface VintageCheckoutCardDialogProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemName?: string;
}

export function VintageCheckoutCardDialog({
  open,
  onClose,
  itemId,
  itemName: fallbackItemName,
}: VintageCheckoutCardDialogProps) {
  const { data, loading, error } = useBorrowHistory(itemId);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          backgroundImage: 'linear-gradient(135deg, #f5f3f0 0%, #f9f7f4 100%)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Checkout History
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && !data && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Checkout history is only visible to item owners and branch members.
          </Alert>
        )}

        {data && (
          <VintageCheckoutCard
            itemName={data.itemName}
            borrowHistory={data.borrowHistory}
            showTitle={false}
          />
        )}

        {!loading && !error && data && data.borrowHistory.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <VintageCheckoutCard
              itemName={data.itemName || fallbackItemName || 'Unknown Item'}
              borrowHistory={[]}
              showTitle={false}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              No checkout history yet. This item is waiting for its first
              borrower!
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
