'use client';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { CapabilityReason } from '@/lib/capabilities';
import { capabilityCopy } from '@/lib/capability-copy';

interface CompleteProfilePromptProps {
  reason: CapabilityReason | null | undefined;
  open: boolean;
  onClose: () => void;
}

/**
 * Just-in-time dialog shown when a user attempts a gated action they cannot
 * yet perform. Server enforcement remains the authority; this is UX only.
 */
export function CompleteProfilePrompt({
  reason,
  open,
  onClose,
}: CompleteProfilePromptProps) {
  const pathname = usePathname();
  if (!reason) return null;

  const copy = capabilityCopy(reason);
  // Return the user to wherever they launched the wizard from.
  const href =
    copy.href && pathname
      ? `${copy.href}&returnTo=${encodeURIComponent(pathname)}`
      : copy.href;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{copy.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{copy.body}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          {href ? 'Not now' : copy.cta}
        </Button>
        {href && (
          <Button
            component={Link}
            href={href}
            variant="contained"
            onClick={onClose}
          >
            {copy.cta}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
