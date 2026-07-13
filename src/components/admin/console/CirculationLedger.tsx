'use client';

import { Box, Skeleton } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import type { CirculationRow } from '@/lib/admin/desk';
import { ledgerTimeLabel } from '@/lib/admin/desk';

import { ConsoleCard, DeskErrorLine, StampChip } from './cards';
import { console_, consoleType } from './tokens';

// Stamps land at slightly different angles per row, like a real ledger.
const STAMP_ROTATIONS = [-3, 2, -2, 3] as const;

const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * Recent circulation — the live ledger. Rows that appear between polls
 * flash `rowFlash` then fade to transparent over 800ms. A failed poll
 * keeps the last-good rows on the page and admits it in the header;
 * only a failed initial load empties the card.
 */
export function CirculationLedger({
  rows,
  error,
}: {
  rows: CirculationRow[] | null;
  error: boolean;
}) {
  const prevIdsRef = useRef<Set<string> | null>(null);
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(EMPTY_SET);

  useEffect(() => {
    if (!rows) return undefined;
    const prev = prevIdsRef.current;
    prevIdsRef.current = new Set(rows.map((r) => r.id));
    if (!prev) return undefined; // first paint — nothing is "new"
    const fresh = rows.filter((r) => !prev.has(r.id)).map((r) => r.id);
    if (fresh.length === 0) return undefined;
    setFreshIds(new Set(fresh));
    // Flip data-fresh off a beat later so the CSS transition actually runs.
    const timer = setTimeout(() => setFreshIds(EMPTY_SET), 50);
    return () => clearTimeout(timer);
  }, [rows]);

  return (
    <ConsoleCard
      title="RECENT CIRCULATION"
      action={
        error && rows !== null ? (
          <Box
            component="span"
            role="status"
            sx={{
              fontFamily: '"Roboto Mono", monospace',
              fontSize: '9.5px',
              letterSpacing: '1px',
              color: console_.textMuted,
            }}
          >
            LAST UPDATE FAILED — RETRYING
          </Box>
        ) : undefined
      }
    >
      {rows === null ? (
        error ? (
          <DeskErrorLine />
        ) : (
          <Box sx={{ display: 'grid', gap: '10px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={30}
                sx={{ backgroundColor: console_.rowSelected }}
              />
            ))}
          </Box>
        )
      ) : rows.length === 0 ? (
        <Box
          component="p"
          sx={{
            ...consoleType.deltaLine,
            fontSize: '11px',
            color: console_.textMuted,
            margin: 0,
            padding: '8px 0',
          }}
        >
          Nothing in circulation yet — quiet desk.
        </Box>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map((row, i) => (
            <Box
              component="li"
              key={row.id}
              data-fresh={freshIds.has(row.id) ? 'true' : 'false'}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '9px 4px',
                borderTop: i > 0 ? `1px dashed ${console_.dashedLine}` : 'none',
                backgroundColor: 'transparent',
                transition: 'background-color 800ms ease-out',
                '&[data-fresh="true"]': {
                  backgroundColor: console_.rowFlash,
                  transition: 'none',
                },
              }}
            >
              <Box
                component="time"
                dateTime={row.at}
                sx={{
                  ...consoleType.deltaLine,
                  color: console_.textMuted,
                  flexShrink: 0,
                  width: '38px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {ledgerTimeLabel(row.at, new Date())}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    fontFamily: '"Roboto Mono", monospace',
                    fontSize: '13px',
                    color: console_.textSecondary,
                  }}
                >
                  {row.text}
                </Box>
                {row.sub && (
                  <Box
                    sx={{
                      ...consoleType.deltaLine,
                      color: console_.textMuted,
                    }}
                  >
                    {row.sub}
                  </Box>
                )}
              </Box>
              <Box sx={{ flexShrink: 0 }}>
                <StampChip
                  label={row.stamp.label}
                  tone={row.stamp.tone}
                  rotation={STAMP_ROTATIONS[i % STAMP_ROTATIONS.length]!}
                />
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </ConsoleCard>
  );
}
