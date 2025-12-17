// app/api/auth/reset-password/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobSeeker from '@/lib/models/jobseeker';
import Employer from '@/lib/models/employer';
import { hashPassword } from '@/lib/auth';
import { isTokenExpired } from '@/lib/token-utils';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const data = await request.json();
    const { token, newPassword } = data;

    // 1. Validation
    if (!token || !newPassword) {
      return NextResponse.json(
        { message: 'Token and new password are required.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    // 2. Find user with this token in both collections
    let user = await JobSeeker.findOne({ passwordResetToken: token });
    let userRole = 'job-seeker';
    
    if (!user) {
      user = await Employer.findOne({ passwordResetToken: token });
      userRole = 'employer';
    }

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid or expired reset token.' },
        { status: 400 }
      );
    }

    // 3. Check if token has expired
    if (isTokenExpired(user.passwordResetTokenExpiry)) {
      return NextResponse.json(
        { message: 'Reset token has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // 4. Check if email is verified (required for password reset)
    if (!user.isEmailVerified) {
      return NextResponse.json(
        { message: 'Please verify your email first.' },
        { status: 403 }
      );
    }

    // 5. Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // 6. Update password and clear reset token
    user.passwordHash = hashedPassword;
    user.passwordResetToken = '';
    user.passwordResetTokenExpiry = undefined;
    await user.save();

    return NextResponse.json(
      { message: 'Password reset successfully! You can now log in with your new password.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset failed:', error);
    return NextResponse.json(
      { message: 'An error occurred during password reset.' },
      { status: 500 }
    );
  }
}

