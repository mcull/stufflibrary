'use client';

import { Box, Skeleton } from '@mui/material';
import { useEffect, useState } from 'react';

import type { DeskResponse } from '@/app/api/admin/desk/route';
import type { CirculationRow } from '@/lib/admin/desk';
import { formatDelta } from '@/lib/admin/desk';

import { DeskErrorLine, KpiCard } from './cards';
import { CirculationLedger } from './CirculationLedger';
import { GrowthPulse } from './GrowthPulse';
import { OnTheDesk } from './OnTheDesk';
import { PaintBudget } from './PaintBudget';
import { SystemHealthCard } from './SystemHealthCard';
import { console_ } from './tokens';

const CIRCULATION_POLL_MS = 45_000;

// Bare 1fr lets nowrap mono text blow the column out (#482); always minmax.
const KPI_GRID = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(2, minmax(0, 1fr))',
    md: 'repeat(5, minmax(0, 1fr))',
  },
  gap: '14px',
} as const;

const MAIN_GRID = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'minmax(0, 1fr)',
    md: 'minmax(0, 2fr) minmax(0, 1fr)',
  },
  gap: '18px',
  marginTop: '18px',
  alignItems: 'start',
} as const;

const COLUMN = { display: 'grid', gap: '18px', alignContent: 'start' } as const;

const skeletonSx = { backgroundColor: console_.rowSelected } as const;

const fmt = (n: number) => n.toLocaleString('en-US');

/** The Desk: KPIs, live ledger, growth pulse, health, and the paint budget. */
export function DeskClient() {
  const [desk, setDesk] = useState<DeskResponse | null>(null);
  const [deskError, setDeskError] = useState(false);
  const [rows, setRows] = useState<CirculationRow[] | null>(null);
  const [circulationError, setCirculationError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/desk');
        if (!res.ok) throw new Error(`desk fetch ${res.status}`);
        const data = (await res.json()) as DeskResponse;
        if (!cancelled) setDesk(data);
      } catch {
        if (!cancelled) setDeskError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;
    const load = async () => {
      // Abort any still-in-flight poll so out-of-order responses can't land.
      controller?.abort();
      const ctrl = new AbortController();
      controller = ctrl;
      try {
        const res = await fetch('/api/admin/circulation?limit=30', {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`circulation fetch ${res.status}`);
        const data = (await res.json()) as CirculationRow[];
        if (!cancelled && !ctrl.signal.aborted) {
          setRows(data);
          setCirculationError(false);
        }
      } catch {
        // An aborted request is our own doing, not a failure.
        if (!cancelled && !ctrl.signal.aborted) setCirculationError(true);
      }
    };
    void load();
    const timer = setInterval(() => void load(), CIRCULATION_POLL_MS);
    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(timer);
    };
  }, []);

  const k = desk?.kpis;

  return (
    <Box>
      {/* KPI row — desk data only; a failed fetch shows the line, never zeros. */}
      {deskError ? (
        <DeskErrorLine />
      ) : !k ? (
        <Box sx={KPI_GRID}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={96} sx={skeletonSx} />
          ))}
        </Box>
      ) : (
        <Box sx={KPI_GRID}>
          <KpiCard
            label="MEMBERS"
            value={fmt(k.members)}
            delta={formatDelta(k.membersWeekDelta, 'this week')}
            deltaTone={k.membersWeekDelta > 0 ? 'green' : 'muted'}
          />
          <KpiCard
            label="ACTIVE LIBRARIES"
            value={fmt(k.activeLibraries)}
            delta={formatDelta(k.librariesMonthDelta, 'this month')}
            deltaTone={k.librariesMonthDelta > 0 ? 'green' : 'muted'}
          />
          <KpiCard
            label="ITEMS ON SHELVES"
            value={fmt(k.itemsOnShelves)}
            delta={`${k.watercolorPct}% with watercolors`}
            deltaTone="muted"
          />
          <KpiCard
            label="BORROWS IN FLIGHT"
            value={fmt(k.borrowsInFlight)}
            delta={
              k.overdueBorrows > 0
                ? `${k.overdueBorrows} overdue`
                : 'none overdue'
            }
            deltaTone={k.overdueBorrows > 0 ? 'red' : 'green'}
          />
          <KpiCard
            label="INVITES · 30D"
            value={fmt(k.invitesSent30d)}
            delta={`${k.invitesAccepted30d} accepted`}
            deltaTone={k.invitesAccepted30d > 0 ? 'green' : 'muted'}
          />
        </Box>
      )}

      <Box sx={MAIN_GRID}>
        {/* Left: the ledger and the pulse */}
        <Box sx={COLUMN}>
          {/* Last-good rows survive a failed poll; the ledger says so itself. */}
          <CirculationLedger rows={rows} error={circulationError} />
          {desk ? (
            <GrowthPulse
              daily={desk.growth.daily}
              signupsToday={desk.growth.signupsToday}
              invitesPending={desk.growth.invitesPending}
              newLibraries7d={desk.growth.newLibraries7d}
              invitesAccepted30d={desk.kpis.invitesAccepted30d}
            />
          ) : deskError ? null : (
            <Skeleton variant="rounded" height={220} sx={skeletonSx} />
          )}
        </Box>

        {/* Right: health (own fetch), the pile, the paint bill */}
        <Box sx={COLUMN}>
          <SystemHealthCard />
          {desk ? (
            <>
              <OnTheDesk
                openReports={desk.onDesk.openReports}
                activeDisputes={desk.onDesk.activeDisputes}
                overdueBorrows={desk.onDesk.overdueBorrows}
              />
              <PaintBudget
                monthCents={desk.paint.monthCents}
                capCents={desk.paint.capCents}
                renders={desk.paint.renders}
              />
            </>
          ) : deskError ? (
            <DeskErrorLine />
          ) : (
            <>
              <Skeleton variant="rounded" height={150} sx={skeletonSx} />
              <Skeleton variant="rounded" height={150} sx={skeletonSx} />
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
