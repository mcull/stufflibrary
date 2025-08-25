import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const createProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required to find your neighbors'),
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
  parsedAddress: z.object({
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
  }).optional(),
});

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
        select: { id: true },
      });
    } else if (session.user?.email) {
      user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
    }

    if (!user) {
      // Create user if they don't exist (happens on first profile creation)
      user = await db.user.create({
        data: {
          id: userId || undefined,
          email: session.user.email,
          name: session.user.name || null,
          image: session.user.image || null,
        },
        select: { id: true },
      });
    }

    const body = await request.json();
    const validatedData = createProfileSchema.parse(body);

    // Use a transaction to create address and update user
    const result = await db.$transaction(async (tx) => {
      let addressId = null;

      // Create address record if we have parsed address data
      if (validatedData.parsedAddress && 
          validatedData.parsedAddress.address1 && 
          validatedData.parsedAddress.city && 
          validatedData.parsedAddress.state && 
          validatedData.parsedAddress.zip) {
        
        // Deactivate any existing active addresses for this user
        await tx.address.updateMany({
          where: { userId: user.id, isActive: true },
          data: { isActive: false }
        });

        // Create new active address
        const newAddress = await tx.address.create({
          data: {
            userId: user.id,
            address1: validatedData.parsedAddress.address1!,
            address2: validatedData.parsedAddress.address2 || '',
            city: validatedData.parsedAddress.city!,
            state: validatedData.parsedAddress.state!,
            zip: validatedData.parsedAddress.zip!,
            country: validatedData.parsedAddress.country || 'US',
            latitude: validatedData.parsedAddress.latitude || undefined,
            longitude: validatedData.parsedAddress.longitude || undefined,
            formattedAddress: validatedData.parsedAddress.formatted_address || undefined,
            placeId: validatedData.parsedAddress.place_id || undefined,
            verificationMethod: 'google_places',
            isActive: true,
          }
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
          currentAddressId: addressId,
          profileCompleted: true,
          onboardingStep: 'complete',
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
          take: 1
        }
      }
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
        currentAddress: currentAddress ? {
          id: currentAddress.id,
          address1: currentAddress.address1,
          address2: currentAddress.address2,
          city: currentAddress.city,
          state: currentAddress.state,
          zip: currentAddress.zip,
          formattedAddress: currentAddress.formattedAddress,
        } : null,
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
        select: { id: true },
      });
    } else if (session.user?.email) {
      user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    // Create update schema (similar to create but allows partial updates)
    const updateSchema = createProfileSchema.partial().extend({
      name: z.string().min(1, 'Name is required'), // Name is still required
    });

    const validatedData = updateSchema.parse(body);

    // Update user with profile information
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.bio !== undefined && { bio: validatedData.bio }),
        ...(validatedData.shareInterests && { shareInterests: validatedData.shareInterests }),
        ...(validatedData.borrowInterests && { borrowInterests: validatedData.borrowInterests }),
        ...(validatedData.image && { image: validatedData.image }),
        // Don't update profileCompleted or onboardingStep on edit
      },
    });

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
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
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
          onboardingStep: true,
          currentAddressId: true,
          movedInDate: true,
          status: true,
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
          onboardingStep: true,
          currentAddressId: true,
          movedInDate: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
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
