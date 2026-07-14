import { Chip } from '@mui/material';

import type { TrustTier } from '@/lib/trust-score';

// Warm, neighborly tier names — a person's standing reads as a relationship,
// not a grade. (Numeric scores stay private to self/admin; see ProfileView.)
// Exported so the admin member record speaks the same names.
export const TRUST_TIER_LABELS: Record<TrustTier, string> = {
  NEW: 'New neighbor',
  BUILDING: 'Getting known',
  TRUSTED: 'Trusted neighbor',
  HIGHLY_TRUSTED: 'Community pillar',
};

const TIER_META: Record<
  TrustTier,
  { label: string; color: 'default' | 'info' | 'success' }
> = {
  NEW: { label: TRUST_TIER_LABELS.NEW, color: 'default' },
  BUILDING: { label: TRUST_TIER_LABELS.BUILDING, color: 'info' },
  TRUSTED: { label: TRUST_TIER_LABELS.TRUSTED, color: 'success' },
  HIGHLY_TRUSTED: {
    label: TRUST_TIER_LABELS.HIGHLY_TRUSTED,
    color: 'success',
  },
};

export function TrustBadge({
  tier,
  size = 'small',
}: {
  tier: TrustTier | string | null | undefined;
  size?: 'small' | 'medium';
}) {
  if (!tier || !(tier in TIER_META)) return null;
  const meta = TIER_META[tier as TrustTier];
  return (
    <Chip
      label={meta.label}
      color={meta.color}
      size={size}
      variant="outlined"
    />
  );
}
