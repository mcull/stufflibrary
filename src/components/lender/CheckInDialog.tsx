'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useState } from 'react';

export type CheckInCondition = 'OK' | 'MINOR_WEAR' | 'DAMAGED';

const CONDITIONS: { value: CheckInCondition; label: string }[] = [
  { value: 'OK', label: 'OK' },
  { value: 'MINOR_WEAR', label: 'Minor wear' },
  { value: 'DAMAGED', label: 'Damaged' },
];

interface CheckInDialogProps {
  open: boolean;
  busy: boolean;
  itemName: string;
  onClose: () => void;
  onConfirm: (condition: CheckInCondition, note: string) => void;
}

/**
 * Condition capture for the owner's direct Check In (#441). The API requires
 * a return condition on lender-return; this dialog is what makes the item
 * page's Check In button able to provide one.
 */
export function CheckInDialog({
  open,
  busy,
  itemName,
  onClose,
  onConfirm,
}: CheckInDialogProps) {
  const [condition, setCondition] = useState<CheckInCondition | null>(null);
  const [note, setNote] = useState('');

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Check In {itemName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          What condition did it come back in?
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={condition}
          onChange={(_e, value) => setCondition(value)}
          fullWidth
          sx={{ mb: 2 }}
        >
          {CONDITIONS.map((option) => (
            <ToggleButton key={option.value} value={option.value}>
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <TextField
          label="Condition note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!condition || busy}
          onClick={() => condition && onConfirm(condition, note)}
        >
          {busy ? 'Checking In…' : 'Check In'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
