import { type NextRequest } from 'next/server';

import { handleInviteLanding } from '@/lib/invite';

// Shareable join link with guest preview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  return handleInviteLanding(request, token);
}
