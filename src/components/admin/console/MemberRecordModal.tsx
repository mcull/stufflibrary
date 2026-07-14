'use client';

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  Skeleton,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';

import { vintageFonts } from '@/components/member-home/vintageTokens';
import { TRUST_TIER_LABELS } from '@/components/TrustBadge';
import {
  borrowStatusStamp,
  ledgerTimeLabel,
  memberStamp,
  monthYearLabel,
  trustBarColor,
} from '@/lib/admin/desk';
import type { TrustTier } from '@/lib/trust-score';
import { brandColors } from '@/theme/brandTokens';

import { DeskErrorLine, StampChip } from './cards';
import { console_, consoleType } from './tokens';

// The member's library card, pulled from the admin's file drawer: cream
// paper, ink rules, stamps — never a raw data printout.

interface MemberRecord {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  phoneVerified: boolean;
  bio: string | null;
  status: string;
  createdAt: string;
  trustScore: number;
  trustTier: string | null;
  addresses: Array<{ city: string; state: string }>;
  borrowRequests: Array<{
    id: string;
    status: string;
    createdAt: string;
    item: { id: string; name: string };
  }>;
  _count: { items: number; borrowRequests: number; ownedCollections: number };
  metrics: {
    recentActivity: number;
    totalBorrowRequests: number;
    approvalRate: number;
  };
}

interface MemberRecordModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const mono = (fontSize: string) =>
  ({ fontFamily: vintageFonts.mono, fontSize }) as const;

const TRUST_INK: Record<ReturnType<typeof trustBarColor>, string> = {
  green: console_.okGreen,
  ink: brandColors.inkBlue,
  red: console_.stampRed,
};

const STATUS_INK: Record<string, string> = {
  active: console_.okGreen,
  suspended: console_.stampRed,
};

/** Mono overline over a dashed hairline — how this card titles a section. */
function SectionTitle({ children }: { children: string }) {
  return (
    <Box
      component="h3"
      sx={{
        ...consoleType.overline,
        color: console_.textMuted,
        borderBottom: `1px dashed ${console_.dashedLine}`,
        paddingBottom: '6px',
        margin: '0 0 10px',
      }}
    >
      {children}
    </Box>
  );
}

/** The same 54×6 trust bar the roster draws — one look for one fact. */
function TrustLine({ score, tier }: { score: number; tier: string | null }) {
  const rounded = Math.round(score);
  const ink = TRUST_INK[trustBarColor(rounded)];
  const tierName =
    tier && tier in TRUST_TIER_LABELS
      ? TRUST_TIER_LABELS[tier as TrustTier]
      : null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Box
        aria-hidden
        sx={{
          width: 54,
          height: 6,
          borderRadius: '3px',
          backgroundColor: console_.dashedLineFaint,
          overflow: 'hidden',
          flexShrink: 0,
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
      {tierName && (
        <Box
          component="span"
          sx={{ ...mono('11px'), color: console_.textSecondary }}
        >
          {tierName}
        </Box>
      )}
    </Box>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        sx={{
          fontFamily: vintageFonts.serif,
          fontWeight: 700,
          fontSize: '18px',
          color: brandColors.inkBlue,
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

export function MemberRecordModal({
  userId,
  isOpen,
  onClose,
}: MemberRecordModalProps) {
  const [user, setUser] = useState<MemberRecord | null>(null);
  const [error, setError] = useState(false);
  // Pins "NEW" and the borrow dates for the life of the mount.
  const nowRef = useRef(new Date());

  useEffect(() => {
    if (!isOpen || !userId) return;
    let cancelled = false;
    setUser(null);
    setError(false);
    (async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/details`);
        if (!res.ok) throw new Error(`member record fetch ${res.status}`);
        const body = (await res.json()) as { user: MemberRecord };
        if (!cancelled) setUser(body.user);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, userId]);

  const displayName = user ? (user.name ?? user.email ?? 'Unknown') : '';
  const stamp = user
    ? memberStamp(
        {
          status: user.status,
          createdAt: user.createdAt,
          ownedLibraries: user._count.ownedCollections,
        },
        nowRef.current
      )
    : null;
  const firstAddress = user?.addresses[0];
  const recentBorrows = user?.borrowRequests.slice(0, 5) ?? [];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      // aria-label is the fallback name while the h2 is still a skeleton
      aria-labelledby="member-record-title"
      aria-label="Member record"
      PaperProps={{
        sx: {
          backgroundColor: brandColors.warmCream,
          border: `1.5px solid ${brandColors.inkBlue}`,
          borderRadius: '8px',
        },
      }}
    >
      <IconButton
        aria-label="Close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: console_.textMuted,
        }}
      >
        <Box component="span" sx={{ ...mono('14px'), lineHeight: 1 }}>
          ✕
        </Box>
      </IconButton>

      <DialogContent sx={{ padding: '22px 26px 10px' }}>
        {error ? (
          <DeskErrorLine />
        ) : !user ? (
          <Box sx={{ display: 'grid', gap: '10px' }}>
            <Skeleton
              variant="rounded"
              height={56}
              sx={{ backgroundColor: console_.rowSelected }}
            />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={64}
                sx={{ backgroundColor: console_.rowSelected }}
              />
            ))}
          </Box>
        ) : (
          <>
            {/* Card header over the 2px ink rule */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '14px',
                borderBottom: `2px solid ${brandColors.inkBlue}`,
                paddingBottom: '14px',
                marginBottom: '16px',
              }}
            >
              <Box
                component="span"
                aria-hidden
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: '50%',
                  backgroundColor: brandColors.inkBlue,
                  color: brandColors.warmCream,
                  fontFamily: vintageFonts.serif,
                  fontWeight: 700,
                  fontSize: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {displayName.trim().charAt(0).toUpperCase() || 'M'}
              </Box>
              <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
                <Box
                  component="h2"
                  id="member-record-title"
                  sx={{
                    fontFamily: vintageFonts.serif,
                    fontWeight: 700,
                    fontSize: '20px',
                    color: brandColors.inkBlue,
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </Box>
                <Box
                  component="span"
                  sx={{ ...mono('11px'), color: console_.textMuted }}
                >
                  {user.email ?? '—'}
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginRight: '28px',
                }}
              >
                {stamp && <StampChip label={stamp.label} tone={stamp.tone} />}
                <Box
                  component="span"
                  sx={{ ...consoleType.overline, color: console_.textMuted }}
                >
                  MEMBER SINCE {monthYearLabel(user.createdAt)}
                </Box>
              </Box>
            </Box>

            {/* STANDING + CONTACT side by side */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
                gap: '20px',
                marginBottom: '18px',
              }}
            >
              <Box>
                <SectionTitle>STANDING</SectionTitle>
                <Box sx={{ display: 'grid', gap: '8px' }}>
                  <Box
                    component="span"
                    sx={{
                      ...mono('11px'),
                      letterSpacing: '1.5px',
                      color: STATUS_INK[user.status] ?? console_.textMuted,
                    }}
                  >
                    {user.status.toUpperCase()}
                  </Box>
                  <TrustLine score={user.trustScore} tier={user.trustTier} />
                </Box>
              </Box>

              <Box>
                <SectionTitle>CONTACT</SectionTitle>
                <Box sx={{ display: 'grid', gap: '6px' }}>
                  <Box
                    component="span"
                    sx={{
                      ...mono('12px'),
                      color: console_.textSecondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.email ?? '—'}
                  </Box>
                  {user.phone ? (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Box
                        component="span"
                        sx={{ ...mono('12px'), color: console_.textSecondary }}
                      >
                        {user.phone}
                      </Box>
                      {user.phoneVerified ? (
                        <Box
                          component="span"
                          sx={{ ...mono('11px'), color: console_.okGreen }}
                        >
                          ✓ verified
                        </Box>
                      ) : (
                        <Box
                          component="span"
                          sx={{ ...mono('11px'), color: console_.textMuted }}
                        >
                          unverified
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box
                      component="span"
                      sx={{ ...mono('12px'), color: console_.textMuted }}
                    >
                      not provided
                    </Box>
                  )}
                  {firstAddress && (
                    <Box
                      component="span"
                      sx={{ ...mono('12px'), color: console_.textSecondary }}
                    >
                      {firstAddress.city}, {firstAddress.state}
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>

            {/* ACTIVITY */}
            <Box sx={{ marginBottom: '18px' }}>
              <SectionTitle>ACTIVITY</SectionTitle>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: '12px',
                }}
              >
                <StatCell label="ITEMS SHARED" value={user._count.items} />
                <StatCell
                  label="TOTAL BORROWS"
                  value={user.metrics.totalBorrowRequests}
                />
                <StatCell
                  label="APPROVAL"
                  value={
                    user.metrics.totalBorrowRequests > 0
                      ? `${Math.round(user.metrics.approvalRate)}%`
                      : '—'
                  }
                />
                <StatCell
                  label="REQUESTS · 30D"
                  value={user.metrics.recentActivity}
                />
              </Box>
            </Box>

            {/* RECENT BORROWS */}
            {recentBorrows.length > 0 && (
              <Box sx={{ marginBottom: '18px' }}>
                <SectionTitle>RECENT BORROWS</SectionTitle>
                {recentBorrows.map((req) => {
                  const view = borrowStatusStamp(req.status);
                  return (
                    <Box
                      key={req.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns:
                          'minmax(0, 1fr) auto minmax(0, 72px)',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '7px 0',
                        borderBottom: `1px dashed ${console_.dashedLine}`,
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          ...mono('12px'),
                          color: console_.textSecondary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {req.item.name}
                      </Box>
                      {view.tone ? (
                        <StampChip label={view.label} tone={view.tone} />
                      ) : (
                        <Box
                          component="span"
                          sx={{ ...mono('10px'), color: console_.textMuted }}
                        >
                          {view.label}
                        </Box>
                      )}
                      <Box
                        component="span"
                        sx={{
                          ...mono('11px'),
                          color: console_.textMuted,
                          textAlign: 'right',
                        }}
                      >
                        {ledgerTimeLabel(req.createdAt, nowRef.current)}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Bio — a margin note, not a form field */}
            {user.bio && (
              <Box
                sx={{
                  backgroundColor: console_.rowHover,
                  borderLeft: `2px solid ${brandColors.mustardYellow}`,
                  padding: '10px 14px',
                  marginBottom: '10px',
                }}
              >
                <Box
                  component="p"
                  sx={{
                    fontFamily: vintageFonts.serif,
                    fontStyle: 'italic',
                    fontSize: '12px',
                    color: console_.textSecondary,
                    margin: 0,
                  }}
                >
                  {user.bio}
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '0 20px 16px' }}>
        <Button
          onClick={onClose}
          sx={{
            ...consoleType.overline,
            backgroundColor: brandColors.white,
            border: `1.5px solid ${brandColors.inkBlue}`,
            borderRadius: '4px',
            color: brandColors.inkBlue,
            padding: '4px 12px',
            minWidth: 0,
            '&:hover': { backgroundColor: console_.rowHover },
          }}
        >
          CLOSE
        </Button>
      </DialogActions>
    </Dialog>
  );
}
