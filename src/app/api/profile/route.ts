import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { TERMS_VERSION } from '@/lib/capabilities';
import { db } from '@/lib/db';
import { geocodeAddress, type Coordinates } from '@/lib/geocode';
import { normalizeUsPhone } from '@/lib/phone';
import { StorageService } from '@/lib/storage';
import { getUserCapabilities } from '@/lib/user-capabilities';

const createProfileSchema = z.object({
  mode: z.enum(['minimal', 'full']).optional().default('full'),
  agreedToTerms: z.boolean().optional().default(false),
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  bio: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
  shareInterests: z.array(z.string()).optional().default([]),
  borrowInterests: z.array(z.string()).optional().default([]),
  image: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().url().optional()
  ),
  // Optional parsed address components from Google Places
  parsedAddress: z
    .object({
      place_id: z.string().nullable().optional(),
      formatted_address: z.string().nullable().optional(),
      address1: z.string().nullable().optional(),
      address2: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      zip: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    })
    .optional(),
});

/**
 * The address fields both save paths supply. Loose/optional throughout because
 * PUT parses its body untyped.
 */
interface ParsedAddressFields {
  address1?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  zip?: string | null | undefined;
  country?: string | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}

/**
 * Coordinates for an address that is about to be saved.
 *
 * Call this BEFORE opening the Prisma transaction. A network round-trip to
 * Google while holding a DB connection is how connection pools get exhausted
 * under load, so by the time `tx.address.create` runs the value is in hand.
 *
 * On the normal autocomplete path the client already supplied coordinates and
 * this costs nothing — no Google call is made. Only a free-form address (typed
 * without picking a suggestion, or a failed place-details lookup) triggers one.
 *
 * A geocoding failure returns null and the address saves without coordinates,
 * exactly as before. Google being down must never block a valid save;
 * scripts/backfill-address-coordinates.ts can pick the row up later.
 */
async function resolveCoordinates(
  parsed: ParsedAddressFields
): Promise<Coordinates | null> {
  if (
    typeof parsed.latitude === 'number' &&
    typeof parsed.longitude === 'number'
  ) {
    return { latitude: parsed.latitude, longitude: parsed.longitude };
  }

  // Not enough to be worth a billable lookup.
  if (!parsed.address1 || !parsed.city || !parsed.state) {
    return null;
  }

  const addressText = [
    parsed.address1,
    parsed.city,
    parsed.state,
    parsed.zip,
    parsed.country,
  ]
    .filter(Boolean)
    .join(', ');

  return geocodeAddress(addressText);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try different ways to get user ID
    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    // Find user by ID or email
    let user;
    if (userId) {
      user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, currentAddressId: true, phone: true },
      });
    } else if (session.user?.email) {
      user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, currentAddressId: true, phone: true },
      });
    }

    if (!user) {
      // Create user if they don't exist (happens on first profile creation)
      user = await db.user.create({
        data: {
          id: userId || undefined,
          email: session.user.email || null,
          name: session.user.name || null,
          image: session.user.image || null,
        },
        select: { id: true, currentAddressId: true, phone: true },
      });
    }

    const body = await request.json();
    const validatedData = createProfileSchema.parse(body);

    if (validatedData.mode === 'minimal') {
      if (!validatedData.agreedToTerms) {
        return NextResponse.json(
          { error: 'You must accept the terms to continue' },
          { status: 400 }
        );
      }
      const minimalUser = await db.user.update({
        where: { id: user.id },
        data: {
          name: validatedData.name,
          onboardingStep: 'minimal',
          agreedToTermsAt: new Date(),
          agreedTermsVersion: TERMS_VERSION,
        },
      });
      return NextResponse.json({
        success: true,
        user: {
          id: minimalUser.id,
          name: minimalUser.name,
          onboardingStep: 'minimal',
        },
      });
    }

    const hasNewParsedAddress = Boolean(
      validatedData.parsedAddress?.address1 &&
        validatedData.parsedAddress?.city &&
        validatedData.parsedAddress?.state &&
        validatedData.parsedAddress?.zip
    );

    // No new address in the submit is fine when a verified one is already on
    // file (e.g. a "just add the photo" continuation) — keep it. Otherwise a
    // full profile still requires a verified address.
    if (!hasNewParsedAddress) {
      const existingAddress = user.currentAddressId
        ? await db.address.findUnique({
            where: { id: user.currentAddressId },
            select: { isActive: true, verificationMethod: true },
          })
        : null;
      const hasVerifiedAddress = Boolean(
        existingAddress?.isActive && existingAddress.verificationMethod
      );
      if (!hasVerifiedAddress) {
        return NextResponse.json(
          { error: 'A verified address is required to complete your profile' },
          { status: 400 }
        );
      }
    }

    const parsed = validatedData.parsedAddress;

    // Resolved outside the transaction on purpose — see resolveCoordinates.
    const coordinates =
      hasNewParsedAddress && parsed ? await resolveCoordinates(parsed) : null;

    // Use a transaction to create address and update user
    const result = await db.$transaction(async (tx) => {
      let addressId = null;

      // Create address record if we have parsed address data
      if (hasNewParsedAddress && parsed) {
        // Deactivate any existing active addresses for this user
        await tx.address.updateMany({
          where: { userId: user.id, isActive: true },
          data: { isActive: false },
        });

        // Create new active address
        const newAddress = await tx.address.create({
          data: {
            userId: user.id,
            address1: parsed.address1!,
            address2: parsed.address2 || '',
            city: parsed.city!,
            state: parsed.state!,
            zip: parsed.zip!,
            country: parsed.country || 'US',
            latitude: coordinates?.latitude ?? null,
            longitude: coordinates?.longitude ?? null,
            formattedAddress: parsed.formatted_address ?? null,
            placeId: parsed.place_id ?? null,
            verificationMethod: 'google_places',
            isActive: true,
          },
        });

        addressId = newAddress.id;
      }

      // Update user with profile information
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          name: validatedData.name,
          bio: validatedData.bio ?? null,
          shareInterests: validatedData.shareInterests,
          borrowInterests: validatedData.borrowInterests,
          image: validatedData.image ?? null,
          // Only repoint when this submit created a new address; otherwise the
          // existing verified address stays current.
          ...(addressId ? { currentAddressId: addressId } : {}),
          profileCompleted: true,
          onboardingStep: 'complete',
          agreedToTermsAt: new Date(),
          agreedTermsVersion: TERMS_VERSION,
        },
      });

      return updatedUser;
    });

    // Get the user with their current address for the response
    const userWithAddress = await db.user.findUnique({
      where: { id: user.id },
      include: {
        addresses: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const currentAddress = userWithAddress?.addresses[0];

    return NextResponse.json({
      success: true,
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        image: result.image,
        bio: result.bio,
        shareInterests: result.shareInterests,
        borrowInterests: result.borrowInterests,
        profileCompleted: result.profileCompleted,
        currentAddress: currentAddress
          ? {
              id: currentAddress.id,
              address1: currentAddress.address1,
              address2: currentAddress.address2,
              city: currentAddress.city,
              state: currentAddress.state,
              zip: currentAddress.zip,
              formattedAddress: currentAddress.formattedAddress,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Profile creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try different ways to get user ID
    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    // Find user by ID or email
    let user;
    if (userId) {
      user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, currentAddressId: true, phone: true },
      });
    } else if (session.user?.email) {
      user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, currentAddressId: true, phone: true },
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Handle FormData for file uploads
    const contentType = request.headers.get('content-type');
    let data: any = {};

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();

      data.name = formData.get('name') as string;
      data.bio = formData.get('bio') as string;
      data.address = formData.get('address') as string;

      const shareInterests = formData.get('shareInterests') as string;
      const borrowInterests = formData.get('borrowInterests') as string;
      const parsedAddressData = formData.get('parsedAddress') as string;

      const phoneField = formData.get('phone');
      if (phoneField !== null) {
        data.phone = phoneField as string;
      }
      const smsOptInField = formData.get('smsOptIn');
      if (smsOptInField !== null) {
        data.smsOptIn = smsOptInField === 'true';
      }

      if (shareInterests) {
        data.shareInterests = JSON.parse(shareInterests);
      }
      if (borrowInterests) {
        data.borrowInterests = JSON.parse(borrowInterests);
      }
      if (parsedAddressData) {
        data.parsedAddress = JSON.parse(parsedAddressData);
      }

      // Handle profile image upload (#458 — this was a TODO that silently
      // discarded the file, so photo updates never saved). Same size/type
      // rules as /api/upload.
      const profileImage = formData.get('profileImage') as File;
      if (profileImage && profileImage.size > 0) {
        if (!StorageService.validateFileSize(profileImage, 10 * 1024 * 1024)) {
          return NextResponse.json(
            { error: 'Photo too large. Maximum size is 10MB.' },
            { status: 400 }
          );
        }
        if (
          !StorageService.validateFileType(profileImage, [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
          ])
        ) {
          return NextResponse.json(
            { error: 'Invalid photo type. Only images are allowed.' },
            { status: 400 }
          );
        }
        const uploaded = await StorageService.uploadFile(
          StorageService.generateUniqueFilename(profileImage.name),
          profileImage,
          { contentType: profileImage.type, addRandomSuffix: false }
        );
        data.image = uploaded.url;
      }
    } else {
      data = await request.json();
    }

    // Simple validation for required fields
    if (!data.name || data.name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Phone + SMS opt-in (#477). Consent must ride with a working number.
    const phoneUpdate: {
      phone?: string | null;
      phoneVerified?: boolean;
      smsOptIn?: boolean;
      smsConsentAt?: Date;
    } = {};
    if (data.phone !== undefined || data.smsOptIn !== undefined) {
      const rawPhone =
        typeof data.phone === 'string' ? data.phone.trim() : undefined;
      const wantsSms = data.smsOptIn === true;

      if (rawPhone) {
        const normalized = normalizeUsPhone(rawPhone);
        if (!normalized) {
          return NextResponse.json(
            { error: 'Enter a valid US mobile number' },
            { status: 400 }
          );
        }
        phoneUpdate.phone = normalized;
        if (normalized !== user.phone) {
          phoneUpdate.phoneVerified = false;
        }
        phoneUpdate.smsOptIn = wantsSms;
        if (wantsSms) {
          phoneUpdate.smsConsentAt = new Date();
        }
      } else if (rawPhone === '') {
        // Number removed — nothing to text, so the opt-in goes with it.
        phoneUpdate.phone = null;
        phoneUpdate.phoneVerified = false;
        phoneUpdate.smsOptIn = false;
      } else if (wantsSms) {
        return NextResponse.json(
          { error: 'Add a mobile number to turn on text notifications' },
          { status: 400 }
        );
      } else if (data.smsOptIn !== undefined) {
        phoneUpdate.smsOptIn = false;
      }
    }

    const hasNewParsedAddress = Boolean(
      data.parsedAddress &&
        data.parsedAddress.address1 &&
        data.parsedAddress.city &&
        data.parsedAddress.state &&
        data.parsedAddress.zip
    );

    // Resolved outside the transaction on purpose — see resolveCoordinates.
    const coordinates = hasNewParsedAddress
      ? await resolveCoordinates(data.parsedAddress)
      : null;

    // Use a transaction to update user and potentially create/update address
    const result = await db.$transaction(async (tx) => {
      let addressId = user.currentAddressId;

      // Handle address update if we have parsed address data
      if (hasNewParsedAddress) {
        // Deactivate any existing active addresses for this user
        await tx.address.updateMany({
          where: { userId: user.id, isActive: true },
          data: { isActive: false },
        });

        // Create new active address
        const newAddress = await tx.address.create({
          data: {
            userId: user.id,
            address1: data.parsedAddress.address1,
            address2: data.parsedAddress.address2 || '',
            city: data.parsedAddress.city,
            state: data.parsedAddress.state,
            zip: data.parsedAddress.zip,
            country: data.parsedAddress.country || 'US',
            latitude: coordinates?.latitude ?? null,
            longitude: coordinates?.longitude ?? null,
            formattedAddress: data.parsedAddress.formatted_address ?? null,
            placeId: data.parsedAddress.place_id ?? null,
            verificationMethod: 'google_places',
            isActive: true,
          },
        });

        addressId = newAddress.id;
      }

      // Update user with profile information
      const updateData: any = {
        name: data.name.trim(),
        currentAddressId: addressId,
        ...phoneUpdate,
      };

      if (data.bio !== undefined) {
        updateData.bio = data.bio.trim() || null;
      }

      if (data.shareInterests) {
        updateData.shareInterests = Array.isArray(data.shareInterests)
          ? data.shareInterests
          : [];
      }

      if (data.borrowInterests) {
        updateData.borrowInterests = Array.isArray(data.borrowInterests)
          ? data.borrowInterests
          : [];
      }

      if (data.image) {
        updateData.image = data.image;
      }

      return await tx.user.update({
        where: { id: user.id },
        data: updateData,
      });
    });

    const updatedUser = result;

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        image: updatedUser.image,
        bio: updatedUser.bio,
        shareInterests: updatedUser.shareInterests,
        borrowInterests: updatedUser.borrowInterests,
        profileCompleted: updatedUser.profileCompleted,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);

    return NextResponse.json(
      {
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try different ways to get user ID
    const userId =
      (session.user as any).id ||
      (session as any).user?.id ||
      (session as any).userId;

    // Find user by ID or email
    let user;
    if (userId) {
      user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          phoneVerified: true,
          image: true,
          bio: true,
          shareInterests: true,
          borrowInterests: true,
          profileCompleted: true,
          agreedToTermsAt: true,
          onboardingStep: true,
          currentAddressId: true,
          movedInDate: true,
          status: true,
          trustScore: true,
          trustTier: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } else if (session.user?.email) {
      user = await db.user.findUnique({
        where: { email: session.user.email },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          phoneVerified: true,
          image: true,
          bio: true,
          shareInterests: true,
          borrowInterests: true,
          profileCompleted: true,
          agreedToTermsAt: true,
          onboardingStep: true,
          currentAddressId: true,
          movedInDate: true,
          status: true,
          trustScore: true,
          trustTier: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Optional library context lets capabilities reflect owner/admin status
    // (e.g. canInvite) for a specific library rather than the global view.
    const libraryId = new URL(request.url).searchParams.get('libraryId');
    const capabilities = await getUserCapabilities(
      user.id,
      libraryId ? { libraryId } : undefined
    );
    return NextResponse.json({
      success: true,
      user,
      capabilities,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
