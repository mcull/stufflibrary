'use client';

import { Box, Skeleton } from '@mui/material';
import { useEffect, useState } from 'react';

import type { AdminBorrowRow } from '@/app/api/admin/borrows/route';
import type { BorrowBoardColumn } from '@/lib/admin/desk';
import {
  borrowBoardColumn,
  dueMeter,
  nudgeDecision,
  waitingLabel,
} from '@/lib/admin/desk';
import { brandColors } from '@/theme/brandTokens';

import { DeskErrorLine, StampChip } from './cards';
import { console_, consoleType } from './tokens';

const POLL_MS = 60_000;

// The design's per-card branch line is omitted: Item↔Collection is
// many-to-many, so a borrow has no single library to name honestly
// (same call as the circulation ledger).

// Red-tinted card border for the overdue column (design artboard 2d).
const OVERDUE_CARD_BORDER = '#E4C4C1';

const COLUMNS: ReadonlyArray<{
  key: BorrowBoardColumn;
  title: string;
  rule: string;
  empty: string;
  emptyInk: string;
}> = [
  {
    key: 'requested',
    title: 'REQUESTED',
    rule: brandColors.inkBlue,
    empty: 'none waiting',
    emptyInk: console_.textMuted,
  },
  {
    key: 'out',
    title: 'OUT · ON LOAN',
    rule: brandColors.inkBlue,
    empty: 'nothing out',
    emptyInk: console_.textMuted,
  },
  {
    key: 'overdue',
    title: 'OVERDUE',
    rule: console_.stampRed,
    empty: 'nothing overdue',
    // An empty overdue column is good news — say it calmly in green.
    emptyInk: console_.okGreen,
  },
  {
    key: 'returnedToday',
    title: 'RETURNED TODAY',
    rule: console_.okGreen,
    empty: 'no returns today',
    emptyInk: console_.textMuted,
  },
];

// Bare 1fr lets nowrap mono text blow the column out (#482); always minmax.
const BOARD_GRID = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    md: 'repeat(4, minmax(0, 1fr))',
  },
  gap: '14px',
  alignItems: 'start',
} as const;

const monoLine = {
  fontFamily: '"Roboto Mono", monospace',
  fontSize: '10.5px',
} as const;

const name = (person: { name: string | null }) => person.name ?? '—';

const shortDate = (at: string) =>
  new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function DueBar({ pct, label }: { pct: number; label: string }) {
  return (
    <Box sx={{ marginTop: '8px' }}>
      <Box
        sx={{
          height: '4px',
          borderRadius: '2px',
          backgroundColor: console_.dashedLineFaint,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: brandColors.inkBlue,
          }}
        />
      </Box>
      <Box sx={{ ...monoLine, color: console_.textMuted, marginTop: '4px' }}>
        {label}
      </Box>
    </Box>
  );
}

/**
 * The desk's two bell buttons (design artboard 2d): REMIND OWNER wears the
 * secondary suit, NUDGE the danger one; a spent bell goes quiet grey.
 */
function NudgeButton({
  label,
  danger = false,
  disabled = false,
  onClick,
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const ink = danger ? console_.stampRed : brandColors.inkBlue;
  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={onClick}
      sx={{
        fontFamily: '"Roboto Mono", monospace',
        fontSize: '9.5px',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        color: disabled ? console_.textMuted : ink,
        backgroundColor: brandColors.white,
        border: `1.5px solid ${disabled ? console_.cardBorder : ink}`,
        borderRadius: '4px',
        padding: '5px 10px',
        marginTop: '8px',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {label}
    </Box>
  );
}

// What this card's bell has done this session. The server is the referee
// (409/429); the card only remembers its own presses.
type NudgePhase =
  | { state: 'idle' }
  | { state: 'sent' }
  | { state: 'throttled'; lastAt: string | null }
  | { state: 'failed' };

function BorrowCard({
  row,
  column,
  now,
}: {
  row: AdminBorrowRow;
  column: BorrowBoardColumn;
  now: Date;
}) {
  const [nudge, setNudge] = useState<NudgePhase>({ state: 'idle' });

  const meter =
    column === 'out' || column === 'overdue'
      ? dueMeter(row.requestedReturnDate, row.approvedAt ?? row.createdAt, now)
      : null;

  // Only the two actionable columns ask the pure helper; it says which
  // bell (if any) this card may ring — same rules the endpoint enforces.
  const decision =
    column === 'requested' || column === 'overdue'
      ? nudgeDecision(row, now)
      : null;

  // The freshest true reminder fact we hold: an ok press means "today",
  // a 429 carries the server's date, otherwise whatever the row said.
  const lastReminderAt =
    nudge.state === 'sent'
      ? now.toISOString()
      : nudge.state === 'throttled'
        ? (nudge.lastAt ?? row.lastOverdueReminderAt)
        : row.lastOverdueReminderAt;

  const sendNudge = async () => {
    try {
      const res = await fetch(`/api/admin/borrows/${row.id}/nudge`, {
        method: 'POST',
      });
      if (res.ok) {
        setNudge({ state: 'sent' });
        return;
      }
      if (res.status === 429) {
        // Someone beat us to it — show the reminder fact, not an error.
        const body = (await res.json().catch(() => null)) as {
          lastOverdueReminderAt?: string | null;
        } | null;
        setNudge({
          state: 'throttled',
          lastAt: body?.lastOverdueReminderAt ?? null,
        });
        return;
      }
      setNudge({ state: 'failed' });
    } catch {
      setNudge({ state: 'failed' });
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: brandColors.white,
        border: `1px solid ${
          column === 'overdue' ? OVERDUE_CARD_BORDER : console_.cardBorder
        }`,
        borderRadius: '6px',
        padding: '12px',
      }}
    >
      <Box
        sx={{
          fontFamily: 'Merriweather, Georgia, serif',
          fontWeight: 700,
          fontSize: '13.5px',
          color: brandColors.inkBlue,
        }}
      >
        {row.item.name}
      </Box>
      <Box sx={{ ...monoLine, color: console_.textSecondary }}>
        {column === 'requested'
          ? `${name(row.borrower)} asks ${name(row.lender)}`
          : `${name(row.borrower)}, from ${name(row.lender)}`}
      </Box>

      {column === 'requested' && (
        <>
          <Box
            sx={{ ...monoLine, color: console_.textMuted, marginTop: '6px' }}
          >
            {waitingLabel(row.createdAt, now)}
          </Box>
          {lastReminderAt && (
            <Box
              sx={{ ...monoLine, color: console_.textMuted, marginTop: '4px' }}
            >
              last reminder {shortDate(lastReminderAt)}
            </Box>
          )}
        </>
      )}

      {column === 'out' && meter && (
        <>
          {/* Stamp only when the borrow is not plainly ACTIVE. */}
          {row.status !== 'ACTIVE' && (
            <Box sx={{ marginTop: '8px' }}>
              <StampChip
                label={
                  row.status === 'RETURN_PENDING'
                    ? 'RETURN PENDING'
                    : 'APPROVED'
                }
                tone={row.status === 'RETURN_PENDING' ? 'mustard' : 'ink'}
              />
            </Box>
          )}
          <DueBar pct={meter.pct} label={meter.label} />
        </>
      )}

      {column === 'overdue' && meter && (
        <>
          <Box sx={{ marginTop: '8px' }}>
            <StampChip label={meter.label.toUpperCase()} tone="red" />
          </Box>
          {/* Real reminder facts only — no invented nudge history. */}
          {lastReminderAt && (
            <Box
              sx={{ ...monoLine, color: console_.textMuted, marginTop: '6px' }}
            >
              last reminder {shortDate(lastReminderAt)}
            </Box>
          )}
        </>
      )}

      {decision && (
        <>
          <NudgeButton
            label={
              nudge.state === 'sent'
                ? 'REMINDED'
                : decision.kind === 'REMIND_OWNER'
                  ? 'REMIND OWNER'
                  : 'NUDGE'
            }
            danger={decision.kind === 'NUDGE_BORROWER'}
            disabled={nudge.state === 'sent'}
            onClick={() => void sendNudge()}
          />
          {nudge.state === 'failed' && (
            <Box
              sx={{ ...monoLine, color: console_.stampRed, marginTop: '4px' }}
            >
              could not send
            </Box>
          )}
        </>
      )}

      {column === 'returnedToday' && (
        <>
          <Box sx={{ marginTop: '8px' }}>
            <StampChip label="RETURNED" tone="green" />
          </Box>
          {row.returnCondition && (
            <Box
              sx={{ ...monoLine, color: console_.textMuted, marginTop: '6px' }}
            >
              condition: {row.returnCondition.replace(/_/g, ' ').toLowerCase()}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

/**
 * The Borrows state board (artboard 2d): four columns, every in-flight
 * borrow in exactly one of them. Cards that can act carry a bell:
 * REMIND OWNER on requests that have waited over a day, NUDGE on
 * overdue loans — both through POST /api/admin/borrows/[id]/nudge.
 */
export function BorrowsBoardClient() {
  const [rows, setRows] = useState<AdminBorrowRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;
    const load = async () => {
      // Abort any still-in-flight poll so out-of-order responses can't land.
      controller?.abort();
      const ctrl = new AbortController();
      controller = ctrl;
      try {
        const res = await fetch('/api/admin/borrows', { signal: ctrl.signal });
        if (!res.ok) throw new Error(`borrows fetch ${res.status}`);
        const data = (await res.json()) as AdminBorrowRow[];
        if (!cancelled && !ctrl.signal.aborted) {
          setRows(data);
          setError(false);
        }
      } catch {
        // An aborted request is our own doing, not a failure.
        if (!cancelled && !ctrl.signal.aborted) setError(true);
      }
    };
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(timer);
    };
  }, []);

  if (rows === null) {
    return error ? (
      <DeskErrorLine />
    ) : (
      <Box sx={BOARD_GRID}>
        {COLUMNS.map((col) => (
          <Skeleton
            key={col.key}
            variant="rounded"
            height={220}
            sx={{ backgroundColor: console_.rowSelected }}
          />
        ))}
      </Box>
    );
  }

  // Bucketing lives in the pure helper — the single source of truth.
  const now = new Date();
  const buckets: Record<BorrowBoardColumn, AdminBorrowRow[]> = {
    requested: [],
    out: [],
    overdue: [],
    returnedToday: [],
  };
  for (const row of rows) {
    const column = borrowBoardColumn(row, now);
    if (column) buckets[column].push(row);
  }

  return (
    <Box sx={BOARD_GRID}>
      {COLUMNS.map((col) => {
        const cards = buckets[col.key];
        return (
          <Box component="section" key={col.key} aria-label={col.title}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `2px solid ${col.rule}`,
                paddingBottom: '6px',
                marginBottom: '10px',
              }}
            >
              <Box
                component="span"
                sx={{ ...consoleType.overline, color: col.rule }}
              >
                {col.title}
              </Box>
              <Box
                component="span"
                sx={{
                  fontFamily: '"Roboto Mono", monospace',
                  fontSize: '10px',
                  color: brandColors.inkBlue,
                  border: `1px solid ${brandColors.inkBlue}`,
                  borderRadius: '999px',
                  padding: '0 7px',
                  lineHeight: '16px',
                }}
              >
                {cards.length}
              </Box>
            </Box>

            {cards.length === 0 ? (
              <Box
                component="p"
                sx={{
                  ...monoLine,
                  fontSize: '11px',
                  color: col.emptyInk,
                  margin: 0,
                  padding: '6px 0',
                }}
              >
                {col.empty}
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gap: '10px' }}>
                {cards.map((row) => (
                  <BorrowCard
                    key={row.id}
                    row={row}
                    column={col.key}
                    now={now}
                  />
                ))}
              </Box>
            )}

            {col.key === 'returnedToday' && (
              <Box
                sx={{
                  ...monoLine,
                  color: console_.textFaint,
                  border: `1px dashed ${console_.dashedLine}`,
                  borderRadius: '6px',
                  padding: '8px 12px',
                  marginTop: '10px',
                  textAlign: 'center',
                }}
              >
                returns leave the board after 24h
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
