'use client';

import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';
import { Fab, Tooltip } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export function FloatingFeedbackFab() {
  const { data: session } = useSession();
  const router = useRouter();

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

  // Show only for authenticated users
  if (!session?.user) return null;

  return (
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
  );
}
