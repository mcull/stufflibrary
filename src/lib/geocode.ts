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
 * tested without a database.
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
 * Resolve an address string to coordinates.
 *
 * Never throws — every failure mode (missing key, network error, no match,
 * malformed payload) returns `null` so callers can carry on without
 * coordinates. Each mode logs distinguishably; a silent failure here would
 * recreate the invisible gap this exists to close.
 */
export async function geocodeAddress(
  addressText: string
): Promise<Coordinates | null> {
  const address = addressText?.trim();
  if (!address) {
    return null;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error(
      'Geocoding skipped: GOOGLE_PLACES_API_KEY is not configured. Addresses will be saved without coordinates.'
    );
    return null;
  }

  const url = `${GEOCODE_ENDPOINT}?address=${encodeURIComponent(
    address
  )}&key=${apiKey}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    console.error('Geocoding request failed (network error):', error);
    return null;
  }

  if (!response.ok) {
    console.error(
      `Geocoding request failed with HTTP ${response.status} for address: ${address}`
    );
    return null;
  }

  let payload: any;
  try {
    payload = await response.json();
  } catch (error) {
    console.error('Geocoding response was not valid JSON:', error);
    return null;
  }

  const status = payload?.status;

  if (status === 'REQUEST_DENIED') {
    console.error(
      'Geocoding REQUEST_DENIED — the Geocoding API may not be enabled for GOOGLE_PLACES_API_KEY ' +
        '(it is a separate product from the Places API in Google Cloud), or the key is restricted. ' +
        `Google said: ${payload?.error_message ?? '(no error_message)'}`
    );
    return null;
  }

  if (status === 'ZERO_RESULTS') {
    console.warn(`Geocoding found no match for address: ${address}`);
    return null;
  }

  if (status !== 'OK') {
    console.error(
      `Geocoding returned status ${status ?? '(none)'} for address: ${address}. ` +
        `Google said: ${payload?.error_message ?? '(no error_message)'}`
    );
    return null;
  }

  const location = payload?.results?.[0]?.geometry?.location;
  const latitude = location?.lat;
  const longitude = location?.lng;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    console.error(
      `Geocoding returned OK but no usable coordinates for address: ${address}`
    );
    return null;
  }

  return { latitude, longitude };
}
