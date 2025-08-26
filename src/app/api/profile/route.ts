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
          email: session.user.email || null,
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
      if (
        validatedData.parsedAddress &&
        validatedData.parsedAddress.address1 &&
        validatedData.parsedAddress.city &&
        validatedData.parsedAddress.state &&
        validatedData.parsedAddress.zip
      ) {
        // Deactivate any existing active addresses for this user
        await tx.address.updateMany({
          where: { userId: user.id, isActive: true },
          data: { isActive: false },
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
            latitude: validatedData.parsedAddress.latitude ?? null,
            longitude: validatedData.parsedAddress.longitude ?? null,
            formattedAddress:
              validatedData.parsedAddress.formatted_address ?? null,
            placeId: validatedData.parsedAddress.place_id ?? null,
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
        select: { id: true, currentAddressId: true },
      });
    } else if (session.user?.email) {
      user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, currentAddressId: true },
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

      if (shareInterests) {
        data.shareInterests = JSON.parse(shareInterests);
      }
      if (borrowInterests) {
        data.borrowInterests = JSON.parse(borrowInterests);
      }

      // Handle profile image upload
      const profileImage = formData.get('profileImage') as File;
      if (profileImage && profileImage.size > 0) {
        // TODO: Upload to storage service (Vercel Blob, S3, etc.)
        // For now, we'll skip the actual file upload and just note that we would handle it here
        console.log(
          'Profile image received:',
          profileImage.name,
          profileImage.size
        );
        // data.image = uploadedImageUrl;
      }
    } else {
      data = await request.json();
    }

    // Simple validation for required fields
    if (!data.name || data.name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Use a transaction to update user and potentially create/update address
    const result = await db.$transaction(async (tx) => {
      let addressId = user.currentAddressId;

      // Handle address update if we have parsed address data
      if (
        data.parsedAddress &&
        data.parsedAddress.address1 &&
        data.parsedAddress.city &&
        data.parsedAddress.state &&
        data.parsedAddress.zip
      ) {
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
            latitude: data.parsedAddress.latitude ?? null,
            longitude: data.parsedAddress.longitude ?? null,
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
