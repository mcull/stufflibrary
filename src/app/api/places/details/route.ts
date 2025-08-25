import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const placeId = searchParams.get('place_id');

    if (!placeId) {
      return NextResponse.json({ error: 'place_id parameter is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('Google Places API key not configured');
      return NextResponse.json({ error: 'API not configured' }, { status: 500 });
    }

    // Use the new Places API (New) - Place Details endpoint
    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,formattedAddress,addressComponents,location'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Place details API (New) error:', errorData);
      return NextResponse.json({ error: 'Failed to fetch place details', details: errorData }, { status: response.status });
    }

    const place = await response.json();
    
    // Parse address components into structured format (New API format)
    const addressComponents: Record<string, string> = {};
    
    place.addressComponents?.forEach((component: any) => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        addressComponents.street_number = component.longText;
      }
      if (types.includes('route')) {
        addressComponents.route = component.longText;
      }
      if (types.includes('subpremise')) {
        addressComponents.unit = component.longText; // Apt, Suite, Unit number
      }
      if (types.includes('locality')) {
        addressComponents.city = component.longText;
      }
      if (types.includes('administrative_area_level_1')) {
        addressComponents.state = component.shortText;
      }
      if (types.includes('postal_code')) {
        addressComponents.postal_code = component.longText;
      }
      if (types.includes('postal_code_suffix')) {
        addressComponents.postal_code_suffix = component.longText;
      }
      if (types.includes('country')) {
        addressComponents.country = component.shortText;
      }
    });

    // Construct address1 (street number + route)
    const address1 = [
      addressComponents.street_number,
      addressComponents.route
    ].filter(Boolean).join(' ');

    // address2 is for apt/suite/unit numbers
    const address2 = addressComponents.unit || null;

    // Construct full zip code (postal code + suffix if available)
    const zip = [
      addressComponents.postal_code,
      addressComponents.postal_code_suffix
    ].filter(Boolean).join('-');

    const parsedAddress = {
      place_id: place.id,
      formatted_address: place.formattedAddress,
      address1: address1,
      address2: address2,
      city: addressComponents.city,
      state: addressComponents.state,
      zip: zip,
      country: addressComponents.country,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
    };

    return NextResponse.json(parsedAddress);
  } catch (error) {
    console.error('Place details API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch place details' },
      { status: 500 }
    );
  }
}