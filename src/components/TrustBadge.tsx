import { Chip } from '@mui/material';

import type { TrustTier } from '@/lib/trust-score';

// Warm, neighborly tier names — a person's standing reads as a relationship,
// not a grade. (Numeric scores stay private to self/admin; see ProfileView.)
const TIER_META: Record<
  TrustTier,
  { label: string; color: 'default' | 'info' | 'success' }
> = {
  NEW: { label: 'New neighbor', color: 'default' },
  BUILDING: { label: 'Getting known', color: 'info' },
  TRUSTED: { label: 'Trusted neighbor', color: 'success' },
  HIGHLY_TRUSTED: { label: 'Community pillar', color: 'success' },
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
