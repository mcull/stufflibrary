import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { checkSpendCap, recordSpend } from '@/lib/spend-cap';

// Places API (New) Text Search with address fields is ~3.2¢ per request.
const TEXT_SEARCH_COST_CENTS = 4;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const input = searchParams.get('input');

    if (!input) {
      return NextResponse.json(
        { error: 'Input parameter is required' },
        { status: 400 }
      );
    }

    if (input.length < 3) {
      return NextResponse.json({ predictions: [] });
    }

    const spendCap = await checkSpendCap('places');
    if (!spendCap.allowed) {
      return NextResponse.json({ error: spendCap.reason }, { status: 429 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('Google Places API key not configured');
      return NextResponse.json(
        { error: 'API not configured' },
        { status: 500 }
      );
    }

    // Use the new Places API (New) - Text Search endpoint for autocomplete
    const url = new URL('https://places.googleapis.com/v1/places:searchText');

    const requestBody = {
      textQuery: input,
      regionCode: 'US',
      maxResultCount: 5,
    };

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.addressComponents',
      },
      body: JSON.stringify(requestBody),
    });

    await recordSpend('places', TEXT_SEARCH_COST_CENTS);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Places API (New) error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch addresses', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform the response to match our expected format
    const predictions = (data.places || []).map((place: any) => ({
      place_id: place.id,
      description: place.formattedAddress || place.displayName?.text,
      structured_formatting: {
        main_text: place.displayName?.text,
        secondary_text: place.formattedAddress,
      },
      types: ['address'],
    }));

    return NextResponse.json({ predictions });
  } catch (error: any) {
    console.error('Places API error:', error);
    console.error('Error response:', error?.response?.data);
    console.error('Error status:', error?.response?.status);

    return NextResponse.json(
      {
        error: 'Failed to fetch address suggestions',
        details: error?.response?.data || error.message,
        status: error?.response?.status,
      },
      { status: 500 }
    );
  }
}
