'use client';

import { ConditionalNavigation } from './ConditionalNavigation';

interface ConditionalHeaderProps {
  title?: string;
  showBackButton?: boolean;
  backUrl?: string;
}

export function ConditionalHeader(props: ConditionalHeaderProps) {
  // Forward to new unified navigation component
  return <ConditionalNavigation {...props} />;
}
