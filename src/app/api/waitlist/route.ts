import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const prisma = new PrismaClient();

const waitlistSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  name: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  interests: z.array(z.string()).optional().default([]),
  source: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validatedData = waitlistSchema.parse(body);

    // Check if email already exists
    const existingEntry = await prisma.waitlistEntry.findUnique({
      where: { email: validatedData.email },
    });

    if (existingEntry) {
      return NextResponse.json(
        { message: 'Email is already on the waitlist!' },
        { status: 400 }
      );
    }

    // Create new waitlist entry
    const waitlistEntry = await prisma.waitlistEntry.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        location: validatedData.location,
        interests: validatedData.interests,
        source: validatedData.source,
      },
    });

    return NextResponse.json(
      {
        message: 'Successfully joined the waitlist!',
        id: waitlistEntry.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Waitlist API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          message: 'Invalid data provided',
          errors: error.errors,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { message: 'Email is already on the waitlist!' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  try {
    const count = await prisma.waitlistEntry.count();

    return NextResponse.json(
      {
        count,
        message: `${count} neighbors on the waitlist`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Waitlist count error:', error);

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
