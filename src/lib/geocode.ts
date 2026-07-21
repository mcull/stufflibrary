/**
 * Server-side address → coordinates lookup.
 *
 * Members are plotted on library maps from `Address.latitude`/`longitude`.
 * Those are normally supplied by the Google Places autocomplete flow, but a
 * user can type a free-form address without picking a suggestion, and the
 * place-details lookup can fail. This module is the fallback so an address
 * never silently ends up unplottable.
 *
 * Deliberately free of Prisma and of any request context: pure I/O against
 * Google, so it can be called from a route handler or a backfill script and
 * tested without a database. Spend capping lives at the call sites, which is
 * why the result distinguishes billable outcomes from non-billable ones.
 *
 * NOTE: the Geocoding API is a separate product from the Places API in Google
 * Cloud. `GOOGLE_PLACES_API_KEY` may not have it enabled — that shows up as a
 * `REQUEST_DENIED` status, which is logged loudly for exactly that reason.
 */

const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * The outcome of a geocode attempt.
 *
 * `ok` and `no_match` are both **billable**: Google received the request and
 * answered it, and an address it searched for and couldn't match costs the
 * same as one it could. `failed` is **not** billable — the request was
 * rejected, never sent, or never answered.
 *
 * The distinction matters because the backfill runs over exactly the addresses
 * that already failed to geocode client-side, so `no_match` may be most of
 * that population rather than an edge case. Collapsing it into "failed" would
 * let a run make hundreds of billable calls while recording almost no spend.
 */
export type GeocodeResult =
  | { outcome: 'ok'; coordinates: Coordinates }
  | { outcome: 'no_match' }
  | { outcome: 'failed'; reason: string };

/**
 * Whether Google charged us for this attempt. Callers record spend on `true`.
 *
 * Lives here rather than at the call sites so the two of them can't drift on
 * what counts as billable.
 */
export function isBillableOutcome(result: GeocodeResult): boolean {
  return result.outcome === 'ok' || result.outcome === 'no_match';
}

function failed(reason: string): GeocodeResult {
  return { outcome: 'failed', reason };
}

/**
 * Resolve an address string to coordinates.
 *
 * Never throws — every failure mode (missing key, network error, no match,
 * malformed payload) comes back as a result, so callers can carry on without
 * coordinates. Each mode logs distinguishably; a silent failure here would
 * recreate the invisible gap this exists to close.
 */
export async function geocodeAddress(
  addressText: string
): Promise<GeocodeResult> {
  const address = addressText?.trim();
  if (!address) {
    return failed('empty address text');
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error(
      'Geocoding skipped: GOOGLE_PLACES_API_KEY is not configured. Addresses will be saved without coordinates.'
    );
    return failed('GOOGLE_PLACES_API_KEY is not configured');
  }

  const url = `${GEOCODE_ENDPOINT}?address=${encodeURIComponent(
    address
  )}&key=${apiKey}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    console.error('Geocoding request failed (network error):', error);
    return failed(`network error: ${String(error)}`);
  }

  if (!response.ok) {
    console.error(
      `Geocoding request failed with HTTP ${response.status} for address: ${address}`
    );
    return failed(`HTTP ${response.status}`);
  }

  let payload: any;
  try {
    payload = await response.json();
  } catch (error) {
    console.error('Geocoding response was not valid JSON:', error);
    return failed('response was not valid JSON');
  }

  const status = payload?.status;

  if (status === 'REQUEST_DENIED') {
    // Not billable: Google rejected the request rather than answering it.
    console.error(
      'Geocoding REQUEST_DENIED — the Geocoding API may not be enabled for GOOGLE_PLACES_API_KEY ' +
        '(it is a separate product from the Places API in Google Cloud), or the key is restricted. ' +
        `Google said: ${payload?.error_message ?? '(no error_message)'}`
    );
    return failed('REQUEST_DENIED');
  }

  if (status === 'ZERO_RESULTS') {
    // Billable: Google searched and found nothing. Still a charged request.
    console.warn(`Geocoding found no match for address: ${address}`);
    return { outcome: 'no_match' };
  }

  if (status !== 'OK') {
    console.error(
      `Geocoding returned status ${status ?? '(none)'} for address: ${address}. ` +
        `Google said: ${payload?.error_message ?? '(no error_message)'}`
    );
    return failed(`status ${status ?? '(none)'}`);
  }

  const location = payload?.results?.[0]?.geometry?.location;
  const latitude = location?.lat;
  const longitude = location?.lng;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    console.error(
      `Geocoding returned OK but no usable coordinates for address: ${address}`
    );
    return failed('OK response had no usable coordinates');
  }

  return { outcome: 'ok', coordinates: { latitude, longitude } };
}
