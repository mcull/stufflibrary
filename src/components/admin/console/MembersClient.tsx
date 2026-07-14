'use client';

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Skeleton,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

import { UserDetailModal } from '@/components/admin/UserDetailModal';
import { vintageFonts } from '@/components/member-home/vintageTokens';
import {
  NEW_MEMBER_WINDOW_MS,
  memberStamp,
  monthYearLabel,
  trustBarColor,
} from '@/lib/admin/desk';
import { brandColors } from '@/theme/brandTokens';

import { DeskErrorLine, StampChip } from './cards';
import { console_, consoleType } from './tokens';

const PAGE_LIMIT = 25;
const SEARCH_DEBOUNCE_MS = 300;

interface MemberRow {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  trustScore: number;
  createdAt: string;
  _count: {
    items: number;
    borrowRequests: number;
    ownedCollections: number;
  };
  collectionMemberships: Array<{ collection: { name: string } }>;
}

interface MembersResponse {
  users: MemberRow[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

type RosterFilter = 'all' | 'owners' | 'suspended' | 'new';

const FILTER_CHIPS: Array<{ key: RosterFilter; label: string }> = [
  { key: 'all', label: 'ALL' },
  { key: 'owners', label: 'OWNERS' },
  { key: 'suspended', label: 'SUSPENDED' },
  { key: 'new', label: 'NEW THIS WEEK' },
];

// MEMBER · HOME LIBRARY · JOINED · SHARES · BORROWS · TRUST · actions.
// Bare 1fr lets nowrap mono text blow the column out (#482); always minmax.
const GRID_COLS =
  'minmax(0, 2.4fr) minmax(0, 1.5fr) minmax(0, 0.9fr) 64px 76px 120px 44px';

const TRUST_INK: Record<ReturnType<typeof trustBarColor>, string> = {
  green: console_.okGreen,
  ink: brandColors.inkBlue,
  red: console_.stampRed,
};

const mono = (fontSize: string) =>
  ({ fontFamily: vintageFonts.mono, fontSize }) as const;

const secondaryButtonSx = {
  ...consoleType.overline,
  backgroundColor: brandColors.white,
  border: `1.5px solid ${brandColors.inkBlue}`,
  borderRadius: '4px',
  color: brandColors.inkBlue,
  padding: '4px 12px',
  minWidth: 0,
  '&:hover': { backgroundColor: console_.rowHover },
  '&.Mui-disabled': { opacity: 0.4, color: brandColors.inkBlue },
} as const;

function TrustCell({ score }: { score: number }) {
  const rounded = Math.round(score);
  const ink = TRUST_INK[trustBarColor(rounded)];
  return (
    <Box role="cell" sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Box
        aria-hidden
        sx={{
          width: 54,
          height: 6,
          borderRadius: '3px',
          backgroundColor: console_.dashedLineFaint,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: `${Math.max(0, Math.min(100, rounded))}%`,
            height: '100%',
            backgroundColor: ink,
          }}
        />
      </Box>
      <Box component="span" sx={{ ...mono('11px'), color: ink }}>
        {rounded}
      </Box>
    </Box>
  );
}

/** The Members roster: search, filter chips, the ledger-ruled table. */
export function MembersClient() {
  const [data, setData] = useState<MembersResponse | null>(null);
  const [listError, setListError] = useState(false);
  const [filter, setFilter] = useState<RosterFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [menu, setMenu] = useState<{
    anchor: HTMLElement;
    user: MemberRow;
  } | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    user: MemberRow;
    action: 'suspend' | 'activate';
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState(false);

  // nowRef pins "new this week" for the life of the mount — stable enough.
  const nowRef = useRef(new Date());

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_LIMIT),
        });
        if (search) params.set('search', search);
        if (filter === 'owners') params.set('ownersOnly', 'true');
        if (filter === 'suspended') params.set('status', 'suspended');
        if (filter === 'new') {
          params.set(
            'joinedAfter',
            new Date(
              nowRef.current.getTime() - NEW_MEMBER_WINDOW_MS
            ).toISOString()
          );
        }
        const res = await fetch(`/api/admin/users?${params}`);
        if (!res.ok) throw new Error(`members fetch ${res.status}`);
        const body = (await res.json()) as MembersResponse;
        if (!cancelled) {
          setData(body);
          setListError(false);
        }
      } catch {
        if (!cancelled) setListError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter, search, page, reloadKey]);

  const pickFilter = useCallback((key: RosterFilter) => {
    setFilter(key);
    setPage(1);
  }, []);

  const runStatusChange = useCallback(async () => {
    if (!confirm) return;
    setConfirmBusy(true);
    setConfirmError(false);
    try {
      const res = await fetch(`/api/admin/users/${confirm.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: confirm.action }),
      });
      if (!res.ok) throw new Error(`status change ${res.status}`);
      setConfirm(null);
      setReloadKey((k) => k + 1);
    } catch {
      setConfirmError(true);
    } finally {
      setConfirmBusy(false);
    }
  }, [confirm]);

  const total = data?.pagination.total ?? 0;
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const rangeEnd = total === 0 ? 0 : rangeStart + (data?.users.length ?? 0) - 1;

  return (
    <Box
      sx={{
        backgroundColor: brandColors.white,
        border: `1px solid ${console_.cardBorder}`,
        borderRadius: '8px',
        padding: '16px 18px',
      }}
    >
      {/* Toolbar: search + roster chips */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '14px',
        }}
      >
        <InputBase
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search name, email…"
          inputProps={{ 'aria-label': 'Search members' }}
          sx={{
            ...mono('11px'),
            color: console_.textSecondary,
            border: `1px solid ${console_.cardBorder}`,
            borderRadius: '4px',
            padding: '5px 10px',
            width: { xs: '100%', sm: '240px' },
            backgroundColor: brandColors.warmCream,
          }}
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {FILTER_CHIPS.map((chip) => {
            const active = filter === chip.key;
            return (
              <Box
                key={chip.key}
                component="button"
                type="button"
                aria-pressed={active}
                onClick={() => pickFilter(chip.key)}
                sx={{
                  ...consoleType.overline,
                  cursor: 'pointer',
                  borderRadius: '999px',
                  padding: '5px 12px',
                  color: active
                    ? brandColors.warmCream
                    : console_.textSecondary,
                  backgroundColor: active
                    ? brandColors.inkBlue
                    : brandColors.white,
                  border: active
                    ? `1px solid ${brandColors.inkBlue}`
                    : `1px solid ${console_.cardBorder}`,
                }}
              >
                {chip.label}
              </Box>
            );
          })}
        </Box>
      </Box>

      {listError ? (
        <DeskErrorLine />
      ) : !data ? (
        <Box sx={{ display: 'grid', gap: '8px' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={38}
              sx={{ backgroundColor: console_.rowSelected }}
            />
          ))}
        </Box>
      ) : (
        <>
          <Box role="table" aria-label="Members">
            {/* Column headers over the 2px ink rule */}
            <Box
              role="row"
              sx={{
                display: 'grid',
                gridTemplateColumns: GRID_COLS,
                gap: '10px',
                alignItems: 'end',
                borderBottom: `2px solid ${brandColors.inkBlue}`,
                paddingBottom: '6px',
              }}
            >
              {['MEMBER', 'HOME LIBRARY', 'JOINED'].map((h) => (
                <Box
                  key={h}
                  component="span"
                  role="columnheader"
                  sx={{ ...consoleType.overline, color: console_.textMuted }}
                >
                  {h}
                </Box>
              ))}
              {['SHARES', 'BORROWS'].map((h) => (
                <Box
                  key={h}
                  component="span"
                  role="columnheader"
                  sx={{
                    ...consoleType.overline,
                    color: console_.textMuted,
                    textAlign: 'right',
                  }}
                >
                  {h}
                </Box>
              ))}
              <Box
                component="span"
                role="columnheader"
                sx={{ ...consoleType.overline, color: console_.textMuted }}
              >
                TRUST
              </Box>
              <Box component="span" role="columnheader" aria-label="Actions" />
            </Box>

            {data.users.map((user) => {
              const stamp = memberStamp(
                {
                  status: user.status,
                  createdAt: user.createdAt,
                  ownedLibraries: user._count.ownedCollections,
                },
                nowRef.current
              );
              const displayName = user.name ?? user.email ?? 'Unknown';
              return (
                <Box
                  key={user.id}
                  role="row"
                  // Inline so the dimming is a plain fact of the DOM, not a class.
                  style={{ opacity: user.status === 'suspended' ? 0.55 : 1 }}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: GRID_COLS,
                    gap: '10px',
                    alignItems: 'center',
                    padding: '9px 0',
                    borderBottom: `1px dashed ${console_.dashedLine}`,
                    '&:hover': { backgroundColor: console_.rowHover },
                  }}
                >
                  {/* MEMBER: avatar initial + name + stamp */}
                  <Box
                    role="cell"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minWidth: 0,
                    }}
                  >
                    <Box
                      component="span"
                      aria-hidden
                      sx={{
                        width: 26,
                        height: 26,
                        flexShrink: 0,
                        borderRadius: '50%',
                        backgroundColor: brandColors.inkBlue,
                        color: brandColors.warmCream,
                        fontFamily: vintageFonts.serif,
                        fontWeight: 700,
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {displayName.trim().charAt(0).toUpperCase() || 'M'}
                    </Box>
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
                      {displayName}
                    </Box>
                    {stamp && (
                      <StampChip label={stamp.label} tone={stamp.tone} />
                    )}
                  </Box>

                  {/* HOME LIBRARY */}
                  <Box
                    component="span"
                    role="cell"
                    sx={{
                      ...mono('12px'),
                      color: console_.textSecondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.collectionMemberships[0]?.collection.name ?? '—'}
                  </Box>

                  {/* JOINED */}
                  <Box
                    component="span"
                    role="cell"
                    sx={{ ...mono('12px'), color: console_.textMuted }}
                  >
                    {monthYearLabel(user.createdAt)}
                  </Box>

                  {/* SHARES / BORROWS */}
                  <Box
                    component="span"
                    role="cell"
                    sx={{
                      ...mono('12px'),
                      color: console_.textSecondary,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {user._count.items}
                  </Box>
                  <Box
                    component="span"
                    role="cell"
                    sx={{
                      ...mono('12px'),
                      color: console_.textSecondary,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {user._count.borrowRequests}
                  </Box>

                  {/* TRUST */}
                  <TrustCell score={user.trustScore} />

                  {/* Actions */}
                  <Box role="cell" sx={{ justifySelf: 'end' }}>
                    <IconButton
                      size="small"
                      aria-label={`Actions for ${displayName}`}
                      onClick={(e) =>
                        setMenu({ anchor: e.currentTarget, user })
                      }
                      sx={{ color: console_.textMuted }}
                    >
                      <Box
                        component="span"
                        sx={{ ...mono('14px'), lineHeight: 1 }}
                      >
                        ⋯
                      </Box>
                    </IconButton>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {data.users.length === 0 && (
            <Box
              component="p"
              sx={{
                ...mono('11px'),
                color: console_.textMuted,
                padding: '18px 0',
                margin: 0,
              }}
            >
              No members match.
            </Box>
          )}

          {/* Pagination footer */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '12px',
            }}
          >
            <Box
              component="span"
              sx={{ ...consoleType.overline, color: console_.textMuted }}
            >
              {total === 0
                ? 'SHOWING 0 OF 0'
                : `SHOWING ${rangeStart}–${rangeEnd} OF ${total}`}
            </Box>
            <Box sx={{ display: 'flex', gap: '8px' }}>
              <Button
                sx={secondaryButtonSx}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                PREV
              </Button>
              <Button
                sx={secondaryButtonSx}
                disabled={page >= (data.pagination.pages || 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                NEXT
              </Button>
            </Box>
          </Box>
        </>
      )}

      {/* Row overflow menu */}
      <Menu
        anchorEl={menu?.anchor ?? null}
        open={menu !== null}
        onClose={() => setMenu(null)}
      >
        <MenuItem
          sx={mono('12px')}
          onClick={() => {
            if (menu) setDetailUserId(menu.user.id);
            setMenu(null);
          }}
        >
          Open record
        </MenuItem>
        {menu?.user.status === 'active' ? (
          <MenuItem
            sx={{ ...mono('12px'), color: console_.stampRed }}
            onClick={() => {
              setConfirm({ user: menu.user, action: 'suspend' });
              setConfirmError(false);
              setMenu(null);
            }}
          >
            Suspend
          </MenuItem>
        ) : menu ? (
          <MenuItem
            sx={{ ...mono('12px'), color: console_.okGreen }}
            onClick={() => {
              setConfirm({ user: menu.user, action: 'activate' });
              setConfirmError(false);
              setMenu(null);
            }}
          >
            Reactivate
          </MenuItem>
        ) : null}
      </Menu>

      {/* Confirm dialog — house style, no window.confirm */}
      <Dialog
        open={confirm !== null}
        onClose={() => (confirmBusy ? undefined : setConfirm(null))}
        PaperProps={{
          sx: {
            backgroundColor: brandColors.white,
            border: `1px solid ${console_.cardBorder}`,
            borderRadius: '8px',
            padding: '6px 4px',
          },
        }}
      >
        <DialogContent>
          <Box
            component="p"
            sx={{
              ...mono('12px'),
              color: console_.textSecondary,
              margin: 0,
            }}
          >
            {confirm?.action === 'suspend'
              ? `Suspend ${confirm.user.name ?? confirm.user.email ?? 'this member'}? They lose borrowing until reactivated.`
              : `Reactivate ${confirm?.user.name ?? confirm?.user.email ?? 'this member'}?`}
          </Box>
          {confirmError && <DeskErrorLine />}
        </DialogContent>
        <DialogActions sx={{ padding: '0 16px 14px' }}>
          <Button
            sx={secondaryButtonSx}
            disabled={confirmBusy}
            onClick={() => setConfirm(null)}
          >
            CANCEL
          </Button>
          <Button
            sx={{
              ...consoleType.overline,
              backgroundColor: brandColors.inkBlue,
              border: `1.5px solid ${brandColors.inkBlue}`,
              borderRadius: '4px',
              color: brandColors.warmCream,
              padding: '4px 12px',
              minWidth: 0,
              '&:hover': { backgroundColor: console_.inkHover },
              '&.Mui-disabled': { opacity: 0.4, color: brandColors.warmCream },
            }}
            disabled={confirmBusy}
            onClick={() => void runStatusChange()}
          >
            {confirm?.action === 'suspend' ? 'SUSPEND' : 'REACTIVATE'}
          </Button>
        </DialogActions>
      </Dialog>

      {detailUserId && (
        <UserDetailModal
          userId={detailUserId}
          isOpen={true}
          onClose={() => setDetailUserId(null)}
        />
      )}
    </Box>
  );
}
