import { rateLimit } from './rate-limit';

/**
 * Failed lookups per IP per minute. Twenty is generous for anyone typing a
 * code off paper and mistyping it, and ruinous for a sweep: the density
 * argument for an 8-character code (one hit per ~4.4M guesses at 250k
 * libraries) is arithmetic on its own. The length buys time; this buys the
 * rest.
 */
export const JOIN_LOOKUP_FAILURE_LIMIT = 20;

const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
  name: 'join-lookup',
});

/**
 * Only FAILURES are counted. A code that resolves is not suspicious — a
 * corkboard flyer in fifty mailboxes is fifty valid arrivals from as many
 * addresses, and metering those would throttle the feature's whole point.
 * A sweep of codes that do not resolve is exactly the enumeration attack.
 */
export async function recordJoinLookupFailure(token: string): Promise<void> {
  await limiter.record(token);
}

/**
 * Asked on EVERY request, before any lookup — including requests that turn
 * out to carry a valid code.
 *
 * Checking only on the failure path, after the lookup, protects nothing: a
 * client past its budget would still have both indexed queries run for it,
 * and a hit would still be served. The oracle would stay open forever at full
 * speed and the sweeper would simply ignore the 429s on the misses. Once the
 * budget is gone, everything from that client stops.
 */
export async function isJoinLookupBlocked(token: string): Promise<boolean> {
  return (await limiter.peek(token)) > JOIN_LOOKUP_FAILURE_LIMIT;
}
