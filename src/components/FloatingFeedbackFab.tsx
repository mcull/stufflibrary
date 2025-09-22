'use client';

import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import { Fab, Tooltip, Snackbar, Button } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export function FloatingFeedbackFab() {
  const { data: session } = useSession();
  const router = useRouter();
  const [coachmarkOpen, setCoachmarkOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      // Avoid triggering while typing in inputs/textareas/selects or contenteditable
      if (['input', 'textarea', 'select'].includes(tag)) return;
      const isEditable = (e.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;
      if (e.key.toLowerCase() === 'f') {
        router.push('/feedback');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  // One-time coachmark to teach the shortcut
  useEffect(() => {
    if (!session?.user) return;
    try {
      const key = 'sl_feedback_coachmark_seen';
      const seen = localStorage.getItem(key);
      if (!seen) {
        setCoachmarkOpen(true);
        // Auto-hide after a few seconds
        const t = setTimeout(() => setCoachmarkOpen(false), 5000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [session?.user]);

  // Show only for authenticated users
  if (!session?.user) return null;

  return (
    <>
      <Tooltip title="Feedback (press ‘f’)" placement="left">
        <Fab
          color="primary"
          aria-label="Feedback"
          component={Link}
          href="/feedback"
          sx={{
            position: 'fixed',
            right: { xs: 16, md: 24 },
            bottom: {
              xs: 'calc(64px + env(safe-area-inset-bottom, 0px) + 12px)',
              md: 24,
            },
            zIndex: 1300,
          }}
        >
          <FeedbackOutlinedIcon />
        </Fab>
      </Tooltip>
      <Snackbar
        open={coachmarkOpen}
        onClose={() => {
          try {
            localStorage.setItem('sl_feedback_coachmark_seen', '1');
          } catch {}
          setCoachmarkOpen(false);
        }}
        message="Press ‘f’ to open Feedback anytime"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              try {
                localStorage.setItem('sl_feedback_coachmark_seen', '1');
              } catch {}
              setCoachmarkOpen(false);
            }}
          >
            Got it
          </Button>
        }
        sx={{
          // Nudge above the bottom nav on mobile
          '& .MuiSnackbar-root, &': {
            bottom: {
              xs: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px) !important',
              md: '24px !important',
            },
            right: { xs: 16, md: 24 },
          },
        }}
      />
    </>
  );
}
