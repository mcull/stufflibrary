'use client';

import { ArrowBack, PhotoLibrary } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  batchDone,
  intakeSummary,
  makeEntries,
  nextToReview,
  patchEntry,
  stillProcessing,
  type IntakeEntry,
} from '@/lib/batch-intake';
import { prepareImage } from '@/lib/image-prep';
import { brandColors } from '@/theme/brandTokens';

const TYPEWRITER = '"Special Elite", "Courier New", monospace';
const MONO = '"Roboto Mono", monospace';
const STAMP = 'Stampette, monospace';

const STATUS_STAMP: Partial<
  Record<IntakeEntry['status'], { label: string; ink: string }>
> = {
  added: { label: 'ADDED', ink: '#1e40af' },
  skipped: { label: 'SKIPPED', ink: '#6b7280' },
  failed: { label: 'NO LUCK', ink: '#dc2626' },
};

interface BatchAddClientProps {
  libraryId?: string | undefined;
}

/**
 * Camera-roll batch intake (#461): pick a stack of photos taken out in the
 * wifi-less garage, and review them one card at a time as recognition and
 * watercolors come back — ADD to the shelf or SKIP.
 */
export function BatchAddClient({ libraryId }: BatchAddClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<IntakeEntry[]>([]);
  const [editedName, setEditedName] = useState('');
  const [activating, setActivating] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const current = nextToReview(entries);
  const processing = stillProcessing(entries);
  const done = batchDone(entries);
  const summary = intakeSummary(entries);

  // Keep the editable name in sync with whichever card is up for review.
  const currentKey = current?.key;
  const currentName = current?.name;
  useEffect(() => {
    setEditedName(currentName ?? '');
  }, [currentKey, currentName]);

  const patch = (key: string, p: Partial<IntakeEntry>) =>
    setEntries((prev) => patchEntry(prev, key, p));

  /** The single-photo pipeline, same endpoints as the live-capture flow. */
  const processEntry = async (key: string, file: File) => {
    patch(key, { status: 'processing' });
    try {
      // Canvas re-encode: strips EXIF/GPS, downsizes phone originals.
      const blob = await prepareImage(file);

      const draftForm = new FormData();
      draftForm.append('image', blob, 'photo.jpg');
      const draftRes = await fetch('/api/items/create-draft', {
        method: 'POST',
        body: draftForm,
      });
      if (!draftRes.ok) throw new Error('Could not save the photo');
      const { itemId } = await draftRes.json();
      patch(key, { itemId });

      // Watercolor paints in the background while recognition runs.
      fetch('/api/items/render-watercolor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
        .then(async (r) => {
          if (r.ok) {
            const { watercolorUrl } = await r.json();
            if (watercolorUrl) patch(key, { watercolorUrl });
          }
        })
        .catch(() => {
          /* the photo preview stands in fine */
        });

      const analysisForm = new FormData();
      analysisForm.append('image', blob, 'photo.jpg');
      const analysisRes = await fetch('/api/analyze-item', {
        method: 'POST',
        body: analysisForm,
      });
      if (!analysisRes.ok) throw new Error('Recognition failed');
      const analysis = await analysisRes.json();
      if (!analysis.recognized || !analysis.name) {
        // Prohibitions arrive as { error: reason } — show the real reason
        // instead of a generic shrug (#469).
        throw new Error(
          analysis.prohibitionReason ||
            analysis.error ||
            'Could not make out what this is'
        );
      }

      await fetch('/api/items/update-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          name: analysis.name,
          description: analysis.description,
          category: analysis.category,
        }),
      });

      patch(key, {
        status: 'ready',
        name: analysis.name,
        description: analysis.description || '',
        category: analysis.category || 'other',
      });
    } catch (err) {
      patch(key, {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Something went wrong',
      });
    }
  };

  const handleFilesPicked = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []).filter((f) =>
      f.type.startsWith('image/')
    );
    event.target.value = ''; // allow re-picking the same files later
    if (files.length === 0) return;
    setPickError(null);

    const previews = files.map((f) => URL.createObjectURL(f));
    const fresh = makeEntries(previews);
    setEntries(fresh);

    // Sequential on purpose: keeps recognition costs and the review rhythm
    // steady — the queue fills in while you stamp the early cards.
    for (let i = 0; i < fresh.length; i++) {
      await processEntry(fresh[i]!.key, files[i]!);
    }
  };

  const handleAdd = async () => {
    if (!current?.itemId) return;
    setActivating(true);
    try {
      // Honor a corrected name before the card goes on the shelf.
      if (editedName.trim() && editedName.trim() !== current.name) {
        await fetch('/api/items/update-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: current.itemId,
            name: editedName.trim(),
            description: current.description,
            category: current.category,
          }),
        });
      }
      const res = await fetch('/api/items/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: current.itemId,
          libraryIds: libraryId ? [libraryId] : [],
        }),
      });
      if (!res.ok) throw new Error('Could not add the item');
      patch(current.key, {
        status: 'added',
        name: editedName.trim() || current.name || '',
      });
    } catch {
      patch(current.key, { status: 'failed', error: 'Could not add the item' });
    } finally {
      setActivating(false);
    }
  };

  const handleSkip = () => {
    if (!current) return;
    // Tidy up the draft; the janitor gets anything we miss.
    if (current.itemId) {
      fetch(`/api/items/${current.itemId}`, { method: 'DELETE' }).catch(
        () => {}
      );
    }
    patch(current.key, { status: 'skipped' });
  };

  const backHref = libraryId ? `/library/${libraryId}` : '/home';

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: brandColors.warmCream }}>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push(backHref)}
          sx={{ mb: 2 }}
        >
          Back
        </Button>

        <Typography
          component="h1"
          sx={{
            fontFamily: TYPEWRITER,
            fontSize: { xs: '30px', md: '38px' },
            color: brandColors.inkBlue,
            mb: 1,
          }}
        >
          Add from your photos
        </Typography>
        <Typography
          sx={{
            fontFamily: MONO,
            fontSize: '13px',
            color: 'rgba(63,52,43,0.7)',
            mb: 4,
          }}
        >
          Pick the photos you took out by the shelves — we&apos;ll recognize
          each one and paint its portrait while you stamp the cards.
        </Typography>

        {/* Phase: pick */}
        {entries.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              data-testid="batch-file-input"
              onChange={handleFilesPicked}
            />
            <Button
              variant="contained"
              size="large"
              startIcon={<PhotoLibrary />}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                fontFamily: MONO,
                background: brandColors.inkBlue,
                borderRadius: '3px',
                px: 4,
                py: 1.5,
                '&:hover': { background: brandColors.tomatoRed },
              }}
            >
              Choose photos
            </Button>
            {pickError && (
              <Alert severity="error" sx={{ mt: 3 }}>
                {pickError}
              </Alert>
            )}
          </Box>
        )}

        {/* Phase: review */}
        {entries.length > 0 && !done && (
          <>
            {current ? (
              <Box
                sx={{
                  background: brandColors.white,
                  border: '1.5px solid #E4DCC8',
                  borderRadius: '8px',
                  p: 3,
                  mb: 3,
                }}
              >
                <Box
                  component="img"
                  src={current.watercolorUrl || current.previewUrl}
                  alt={current.name || 'Your photo'}
                  sx={{
                    width: '100%',
                    aspectRatio: '1.05',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    mb: 1,
                  }}
                />
                {!current.watercolorUrl && (
                  <Typography
                    sx={{
                      fontFamily: MONO,
                      fontSize: '11px',
                      color: 'rgba(63,52,43,0.55)',
                      textAlign: 'center',
                      mb: 2,
                    }}
                  >
                    watercolor still painting — it&apos;ll catch up
                  </Typography>
                )}
                <TextField
                  label="Name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  fullWidth
                  sx={{ mb: 1.5, mt: 1 }}
                />
                {current.description && (
                  <Typography
                    sx={{
                      fontSize: '14px',
                      color: 'rgba(63,52,43,0.75)',
                      mb: 2,
                    }}
                  >
                    {current.description}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={activating || !editedName.trim()}
                    onClick={handleAdd}
                    sx={{
                      fontFamily: MONO,
                      background: brandColors.inkBlue,
                      borderRadius: '3px',
                    }}
                  >
                    {activating ? 'Adding…' : 'Add to shelf'}
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    disabled={activating}
                    onClick={handleSkip}
                    sx={{ fontFamily: MONO, borderRadius: '3px' }}
                  >
                    Skip
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <CircularProgress size={28} />
                <Typography
                  sx={{
                    fontFamily: MONO,
                    fontSize: '13px',
                    color: 'rgba(63,52,43,0.7)',
                    mt: 2,
                  }}
                >
                  Recognizing your photos…
                </Typography>
              </Box>
            )}

            {/* The rail: every photo in the batch, with its stamp. */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {entries.map((entry) => {
                const stamp = STATUS_STAMP[entry.status];
                return (
                  <Box
                    key={entry.key}
                    sx={{ position: 'relative', width: 64, height: 64 }}
                    {...(entry.error && { title: entry.error })}
                  >
                    <Box
                      component="img"
                      src={entry.watercolorUrl || entry.previewUrl}
                      alt=""
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border:
                          entry.key === current?.key
                            ? `2px solid ${brandColors.inkBlue}`
                            : '1.5px solid #E4DCC8',
                        opacity:
                          entry.status === 'skipped' ||
                          entry.status === 'failed'
                            ? 0.45
                            : 1,
                      }}
                    />
                    {(entry.status === 'processing' ||
                      entry.status === 'queued') && (
                      <CircularProgress
                        size={16}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          color: brandColors.inkBlue,
                        }}
                      />
                    )}
                    {stamp && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%,-50%) rotate(-8deg)',
                          fontFamily: STAMP,
                          fontSize: '9px',
                          letterSpacing: '0.1em',
                          color: stamp.ink,
                          border: `1.5px solid ${stamp.ink}`,
                          borderRadius: '3px',
                          px: '4px',
                          background: 'rgba(253,249,239,0.9)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {stamp.label}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
            {processing && current && (
              <Typography
                sx={{
                  fontFamily: MONO,
                  fontSize: '11.5px',
                  color: 'rgba(63,52,43,0.55)',
                  mt: 1.5,
                }}
              >
                still recognizing the rest — they&apos;ll join the queue
              </Typography>
            )}
          </>
        )}

        {/* Phase: done */}
        {done && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                display: 'inline-block',
                fontFamily: STAMP,
                fontSize: '22px',
                letterSpacing: '0.16em',
                color: '#1e40af',
                border: '3px solid #1e40af',
                borderRadius: '6px',
                px: 3,
                py: 1,
                transform: 'rotate(-4deg)',
                opacity: 0.9,
                mb: 3,
              }}
            >
              {summary.added} ADDED TO YOUR SHELF
            </Box>
            {(summary.skipped > 0 || summary.failed > 0) && (
              <Typography
                sx={{
                  fontFamily: MONO,
                  fontSize: '13px',
                  color: 'rgba(63,52,43,0.7)',
                  mb: 3,
                }}
              >
                {summary.skipped > 0 && `${summary.skipped} skipped`}
                {summary.skipped > 0 && summary.failed > 0 && ' · '}
                {summary.failed > 0 && `${summary.failed} we couldn't take in`}
              </Typography>
            )}
            {summary.failed > 0 && (
              <Box sx={{ mb: 3 }}>
                {entries
                  .filter((e) => e.status === 'failed' && e.error)
                  .map((e) => (
                    <Typography
                      key={e.key}
                      sx={{
                        fontFamily: MONO,
                        fontSize: '12px',
                        color: 'rgba(63,52,43,0.6)',
                      }}
                    >
                      {e.name ? `${e.name}: ` : ''}
                      {e.error}
                    </Typography>
                  ))}
              </Box>
            )}
            <Box
              sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}
            >
              <Button
                variant="contained"
                onClick={() => setEntries([])}
                sx={{
                  fontFamily: MONO,
                  background: brandColors.inkBlue,
                  borderRadius: '3px',
                }}
              >
                Add more photos
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push(backHref)}
                sx={{ fontFamily: MONO, borderRadius: '3px' }}
              >
                Done
              </Button>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}
