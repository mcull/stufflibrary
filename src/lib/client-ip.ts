import { type NextRequest } from 'next/server';

/**
 * The client's address for rate-limiting: the first hop of x-forwarded-for,
 * then x-real-ip, then a shared 'unknown' bucket. Shared by every endpoint that
 * meters join-code lookups so the parsing can't drift between them.
 */
export function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}
