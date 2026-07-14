'use client';

import { Box, Button, Skeleton } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import type {
  AdminLibrariesResponse,
  AdminLibraryRow,
} from '@/app/api/admin/libraries/route';
import { vintageFonts } from '@/components/member-home/vintageTokens';
import { branchActivityStamp, monthYearLabel } from '@/lib/admin/desk';
import { brandColors } from '@/theme/brandTokens';

import { BranchAtlasMap } from './BranchAtlasMap';
import { ConsoleCard, DeskErrorLine, StampChip, STAMP_INK } from './cards';
import { console_, consoleType } from './tokens';

const mono = (fontSize: string) =>
  ({ fontFamily: vintageFonts.mono, fontSize }) as const;

const secondaryButtonSx = {
  ...consoleType.overline,
  backgroundColor: brandColors.white,
  border: `1.5px solid ${brandColors.inkBlue}`,
  borderRadius: '4px',
  color: brandColors.inkBlue,
  padding: '5px 14px',
  minWidth: 0,
  textDecoration: 'none',
  '&:hover': { backgroundColor: console_.rowHover },
} as const;

/** One 'big serif numeral over a mono label' cell in the casefile. */
function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        sx={{
          fontFamily: 'Merriweather, Georgia, serif',
          fontWeight: 700,
          fontSize: '26px',
          color: brandColors.inkBlue,
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Box>
      <Box
        component="span"
        sx={{ ...consoleType.overline, color: console_.textMuted }}
      >
        {label}
      </Box>
    </Box>
  );
}

/** The casefile for the selected branch — stats, steward, and OPEN LIBRARY. */
function BranchCasefile({ branch }: { branch: AdminLibraryRow | null }) {
  if (!branch) {
    return (
      <ConsoleCard title="BRANCH CASEFILE">
        <Box
          component="p"
          sx={{ ...mono('11px'), color: console_.textMuted, margin: 0 }}
        >
          Select a branch to see its casefile.
        </Box>
      </ConsoleCard>
    );
  }

  const stamp = branchActivityStamp(branch.borrows30d);

  return (
    <ConsoleCard title="BRANCH CASEFILE">
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '14px',
        }}
      >
        <Box
          component="span"
          sx={{
            fontFamily: vintageFonts.serif,
            fontWeight: 700,
            fontSize: '18px',
            color: console_.textSecondary,
            minWidth: 0,
          }}
        >
          {branch.name}
        </Box>
        <StampChip label={stamp.label} tone={stamp.tone} />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        <StatCell value={branch.memberCount} label="MEMBERS" />
        <StatCell value={branch.itemCount} label="ITEMS" />
        <StatCell value={branch.borrows30d} label="BORROWS · 30D" />
        <StatCell
          value={monthYearLabel(branch.createdAt)}
          label="ESTABLISHED"
        />
      </Box>

      <Box
        component="p"
        sx={{
          ...mono('12px'),
          color: console_.textSecondary,
          margin: 0,
          marginBottom: '10px',
        }}
      >
        Steward · {branch.ownerName ?? '—'}
      </Box>

      {!branch.centroid && (
        <Box
          component="p"
          sx={{
            ...mono('11px'),
            color: console_.darkMustardText,
            margin: 0,
            marginBottom: '12px',
          }}
        >
          off map — no located members
        </Box>
      )}

      <Box
        component="a"
        href={`/library/${branch.id}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button component="span" sx={secondaryButtonSx}>
          OPEN LIBRARY
        </Button>
      </Box>
      {/* Archive + Message deferred: no admin-archive/message mechanism exists yet. */}
    </ConsoleCard>
  );
}

/** One register row: status dot, name, member/item mono, borrows/mo. */
function RegisterRow({
  branch,
  selected,
  onSelect,
}: {
  branch: AdminLibraryRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const stamp = branchActivityStamp(branch.borrows30d);
  return (
    <Box
      role="row"
      onClick={onSelect}
      aria-selected={selected}
      style={{ opacity: branch.isArchived ? 0.55 : 1 }}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: '10px',
        alignItems: 'center',
        cursor: 'pointer',
        padding: '9px 8px',
        borderBottom: `1px dashed ${console_.dashedLine}`,
        backgroundColor: selected ? console_.rowSelected : 'transparent',
        '&:hover': {
          backgroundColor: selected ? console_.rowSelected : console_.rowHover,
        },
      }}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}
      >
        <Box
          aria-hidden
          sx={{
            width: 9,
            height: 9,
            flexShrink: 0,
            borderRadius: '50%',
            backgroundColor: STAMP_INK[stamp.tone],
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
            }}
          >
            <Box
              component="span"
              sx={{
                ...mono('13px'),
                color: console_.textSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {branch.name}
            </Box>
            {!branch.centroid && (
              <Box
                component="span"
                sx={{
                  ...consoleType.overline,
                  color: console_.textFaint,
                  border: `1px solid ${console_.dashedLine}`,
                  borderRadius: '3px',
                  padding: '1px 5px',
                  flexShrink: 0,
                }}
              >
                OFF MAP
              </Box>
            )}
            {branch.isArchived && (
              <Box
                component="span"
                sx={{
                  ...consoleType.overline,
                  color: console_.textMuted,
                  flexShrink: 0,
                }}
              >
                ARCHIVED
              </Box>
            )}
          </Box>
          <Box
            component="span"
            sx={{ ...mono('11px'), color: console_.textMuted }}
          >
            {branch.memberCount} members · {branch.itemCount} items
          </Box>
        </Box>
      </Box>
      <Box
        component="span"
        sx={{
          ...mono('12px'),
          color: console_.textSecondary,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {branch.borrows30d}/mo
      </Box>
    </Box>
  );
}

/**
 * The Libraries Branch Atlas: a derived-from-members map on the left, the
 * selected branch's casefile over the full branch register on the right.
 * Selection is shared — click a marker or a register row, both stay in sync.
 */
export function BranchAtlasClient() {
  const [data, setData] = useState<AdminLibrariesResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/libraries');
        if (!res.ok) throw new Error(`libraries fetch ${res.status}`);
        const body = (await res.json()) as AdminLibrariesResponse;
        if (!cancelled) {
          setData(body);
          setLoadError(false);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const libraries = useMemo(() => data?.libraries ?? [], [data]);
  const located = useMemo(
    () => libraries.filter((l) => l.centroid !== null),
    [libraries]
  );
  const maxItemCount = useMemo(
    () => libraries.reduce((max, l) => Math.max(max, l.itemCount), 0),
    [libraries]
  );
  const selected = libraries.find((l) => l.id === selectedId) ?? null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: 'minmax(0, 1.6fr) minmax(0, 1fr)',
        },
        gap: '18px',
        alignItems: 'start',
      }}
    >
      {/* LEFT — the map */}
      <ConsoleCard title="BRANCH ATLAS">
        {loadError ? (
          <DeskErrorLine />
        ) : !data ? (
          <Skeleton
            variant="rounded"
            height={360}
            sx={{ backgroundColor: console_.rowSelected }}
          />
        ) : (
          <BranchAtlasMap
            libraries={located}
            selectedId={selectedId}
            onSelect={setSelectedId}
            maxItemCount={maxItemCount}
          />
        )}
      </ConsoleCard>

      {/* RIGHT — casefile over the register */}
      <Box sx={{ display: 'grid', gap: '18px', alignContent: 'start' }}>
        <BranchCasefile branch={selected} />

        <ConsoleCard
          title="BRANCH REGISTER"
          action={
            data ? (
              <Box
                component="span"
                sx={{ ...consoleType.overline, color: console_.textMuted }}
              >
                {libraries.length} BRANCHES
              </Box>
            ) : undefined
          }
        >
          {loadError ? (
            <DeskErrorLine />
          ) : !data ? (
            <Box sx={{ display: 'grid', gap: '8px' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rounded"
                  height={40}
                  sx={{ backgroundColor: console_.rowSelected }}
                />
              ))}
            </Box>
          ) : libraries.length === 0 ? (
            <Box
              component="p"
              sx={{ ...mono('11px'), color: console_.textMuted, margin: 0 }}
            >
              No libraries yet.
            </Box>
          ) : (
            <Box role="table" aria-label="Branch register">
              {libraries.map((branch) => (
                <RegisterRow
                  key={branch.id}
                  branch={branch}
                  selected={branch.id === selectedId}
                  onSelect={() => setSelectedId(branch.id)}
                />
              ))}
            </Box>
          )}
        </ConsoleCard>
      </Box>
    </Box>
  );
}
