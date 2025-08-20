import { NextRequest, NextResponse } from 'next/server';

import { sendAuthCode } from '@/lib/auth-codes';
import { sendCodeLimiter } from '@/lib/auth-rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Trim and lowercase email first
    const cleanEmail = email.toLowerCase().trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Rate limiting
    try {
      await sendCodeLimiter.check(5, cleanEmail); // 5 attempts per email
    } catch {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again in 10 minutes.' },
        { status: 429 }
      );
    }

    // Send the auth code
    await sendAuthCode(cleanEmail);

    return NextResponse.json({ 
      success: true, 
      message: 'Auth code sent successfully' 
    });

  } catch (error) {
    console.error('Error sending auth code:', error);
    return NextResponse.json(
      { error: 'Failed to send auth code. Please try again.' },
      { status: 500 }
    );
  }
}