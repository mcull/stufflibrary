import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const createProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z
    .string()
    .min(1, 'Phone number is required for SMS notifications')
    .regex(
      /^[\+]?[1-9][\d]{0,15}$/,
      'Please enter a valid phone number (e.g., +15551234567)'
    ),
  bio: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
  interests: z.array(z.string()).min(1, 'At least one interest is required'),
  image: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().url().optional()
  ),
  // Address will be handled separately for now
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createProfileSchema.parse(body);

    // Update user with profile information
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name: validatedData.name,
        phone: validatedData.phone,
        bio: validatedData.bio || null,
        interests: validatedData.interests,
        image: validatedData.image || null,
        profileCompleted: true,
        onboardingStep: 'complete',
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        image: updatedUser.image,
        bio: updatedUser.bio,
        interests: updatedUser.interests,
        profileCompleted: updatedUser.profileCompleted,
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
        ...(validatedData.interests && { interests: validatedData.interests }),
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
        interests: updatedUser.interests,
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
          interests: true,
          profileCompleted: true,
          onboardingStep: true,
          addressId: true,
          addressVerified: true,
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
          interests: true,
          profileCompleted: true,
          onboardingStep: true,
          addressId: true,
          addressVerified: true,
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
