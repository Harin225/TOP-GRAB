// app/api/auth/forgot-password/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobSeeker from '@/lib/models/jobseeker';
import Employer from '@/lib/models/employer';
import { generateTemporaryPassword } from '@/lib/token-utils';
import { hashPassword } from '@/lib/auth';
import { sendNewPasswordEmail } from '@/lib/email';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const data = await request.json();
    const { username } = data;

    // 1. Validation
    if (!username || typeof username !== 'string') {
      // Don't reveal if username exists - always return success
      return NextResponse.json(
        { message: 'If an account with that username exists, a new password has been emailed to the registered address.' },
        { status: 200 }
      );
    }

    const usernameLower = username.toLowerCase().trim();

    // 2. Find user in both collections
    let user = await JobSeeker.findOne({ username: usernameLower });
    if (!user) {
      user = await Employer.findOne({ username: usernameLower });
    }

    // 3. Security: Don't reveal if username exists - always return success
    // But only send email if user exists and has an email on file
    if (user && user.email) {
      console.log('[ForgotPassword] User found:', { username: user.username, email: user.email });
      const newPassword = generateTemporaryPassword(12);
      let emailSent = false;
      try {
        emailSent = await sendNewPasswordEmail(user.email, newPassword, user.firstName);
      } catch (emailError) {
        console.error('Failed to send new password email:', emailError);
      }

      if (emailSent) {
        console.log('[ForgotPassword] Email sent successfully, updating password.');
        const hashedPassword = await hashPassword(newPassword);
        user.passwordHash = hashedPassword;
        user.passwordResetToken = '';
        user.passwordResetTokenExpiry = undefined;
        await user.save();
      } else {
        console.warn('Skipping password update because email could not be sent.');
      }
    } else {
      console.warn('[ForgotPassword] Username not found or email missing:', usernameLower);
    }

    // Always return success message (security: don't reveal if username exists)
    return NextResponse.json(
      { message: 'If an account with that username exists, a new password has been emailed to the registered address.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password failed:', error);
    // Still return success to prevent username enumeration
    return NextResponse.json(
      { message: 'If an account with that username exists, a new password has been emailed to the registered address.' },
      { status: 200 }
    );
  }
}
