import { Chip } from '@mui/material';

import type { TrustTier } from '@/lib/trust-score';

const TIER_META: Record<
  TrustTier,
  { label: string; color: 'default' | 'info' | 'success' }
> = {
  NEW: { label: 'New', color: 'default' },
  BUILDING: { label: 'Building', color: 'info' },
  TRUSTED: { label: 'Trusted', color: 'success' },
  HIGHLY_TRUSTED: { label: 'Highly Trusted', color: 'success' },
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
