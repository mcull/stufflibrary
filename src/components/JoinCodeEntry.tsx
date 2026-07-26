'use client';

import { Box, Button, TextField, Typography } from '@mui/material';
import { useState } from 'react';

import { brandColors } from '@/theme/brandTokens';

type Status = 'idle' | 'checking' | 'error' | 'throttled';

/**
 * The "have a code?" door. A quiet prompt reveals a field; on a valid code it
 * hands off to /join/<code>, which does the real join (signed in) or guest
 * preview (signed out). A bad code shows inline and never navigates, so a
 * signed-in member is not ejected from their lobby on a typo.
 *
 * The raw typed value goes to the server, which normalizes it — so this never
 * imports join-code.ts and never drags node crypto into the client bundle. It
 * only ever calls the resolver on submit, never on mount, so it does not
 * disturb a host surface's own on-mount fetches.
 */
export function JoinCodeEntry() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const message =
    status === 'error'
      ? "That code didn't match — check for typos."
      : status === 'throttled'
        ? 'Too many tries — give it a minute.'
        : '';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || status === 'checking') return;
    setStatus('checking');
    try {
      const res = await fetch('/api/join/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      if (res.status === 429) {
        setStatus('throttled');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        window.location.assign(`/join/${encodeURIComponent(trimmed)}`);
        return;
      }
      setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  if (!open) {
    return (
      <Button
        variant="text"
        onClick={() => setOpen(true)}
        sx={{
          textTransform: 'none',
          color: brandColors.inkBlue,
          textDecoration: 'underline',
          px: 0,
          '&:hover': { textDecoration: 'none', backgroundColor: 'transparent' },
        }}
      >
        Have a code?
      </Button>
    );
  }

  return (
    <Box component="form" onSubmit={submit}>
      <Typography
        variant="body2"
        sx={{ mb: 1, color: brandColors.charcoal, opacity: 0.8 }}
      >
        Enter the code from your invitation or a flyer.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          autoFocus
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (status !== 'checking') setStatus('idle');
          }}
          placeholder="XKF7-2M9Q"
          inputProps={{
            'aria-label': 'Join code',
            autoCapitalize: 'characters',
            autoCorrect: 'off',
            spellCheck: false,
          }}
          error={status === 'error' || status === 'throttled'}
          helperText={message}
          size="small"
          disabled={status === 'checking'}
          sx={{ flex: 1 }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={status === 'checking' || code.trim().length === 0}
          sx={{
            backgroundColor: brandColors.inkBlue,
            color: brandColors.white,
            textTransform: 'none',
            whiteSpace: 'nowrap',
            py: 1,
            '&:hover': { backgroundColor: '#1a2f4f' },
          }}
        >
          {status === 'checking' ? 'Checking…' : 'Join'}
        </Button>
      </Box>
    </Box>
  );
}
