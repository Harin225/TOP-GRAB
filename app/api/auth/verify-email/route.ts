// app/api/auth/verify-email/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobSeeker from '@/lib/models/jobseeker';
import Employer from '@/lib/models/employer';
import { isTokenExpired } from '@/lib/token-utils';

export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ message: 'Verification token is required.' }, { status: 400 });
    }

    // Search for user with this token in both collections
    let user = await JobSeeker.findOne({ emailVerificationToken: token });
    let userRole = 'job-seeker';
    
    if (!user) {
      user = await Employer.findOne({ emailVerificationToken: token });
      userRole = 'employer';
    }

    if (!user) {
      return NextResponse.json({ message: 'Invalid or expired verification token.' }, { status: 400 });
    }

    // Check if token has expired
    if (isTokenExpired(user.emailVerificationTokenExpiry)) {
      return NextResponse.json({ message: 'Verification token has expired. Please request a new one.' }, { status: 400 });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return NextResponse.json({ message: 'Email is already verified.' }, { status: 200 });
    }

    // Verify the email
    user.isEmailVerified = true;
    user.emailVerificationToken = '';
    user.emailVerificationTokenExpiry = undefined;
    await user.save();

    return NextResponse.json(
      { 
        message: 'Email verified successfully! You can now log in.',
        verified: true
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Email verification failed:', error);
    return NextResponse.json(
      { message: 'An error occurred during email verification.' },
      { status: 500 }
    );
  }
}

