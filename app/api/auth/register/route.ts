// app/api/auth/register/route.ts (Email verification required)

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobSeeker from '@/lib/models/jobseeker';
import Employer from '@/lib/models/employer';
import { hashPassword } from '@/lib/auth';
import { generateSecureToken, generateTokenExpiry } from '@/lib/token-utils';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: Request) {
    await dbConnect();

    try {
        const data = await request.json();
        const { username, password, firstName, lastName, role, email } = data;

        // 1. Basic Validation
        if (!username || !password || !firstName || !lastName || !role) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }
        if (password.length < 6) {
            return NextResponse.json({ message: 'Password must be at least 6 characters long.' }, { status: 400 });
        }
        
        // Email is required for verification
        if (!email || !email.includes('@')) {
            return NextResponse.json({ message: 'Valid email address is required.' }, { status: 400 });
        }

        // Validate role
        if (role !== 'job-seeker' && role !== 'employer') {
            return NextResponse.json({ message: 'Invalid role.' }, { status: 400 });
        }

        const usernameLower = username.toLowerCase();
        const emailLower = email.toLowerCase().trim();

        // 2. Check if user already exists in either collection
        const existingJobSeeker = await JobSeeker.findOne({ 
            $or: [
                { username: usernameLower },
                { email: emailLower }
            ]
        });
        const existingEmployer = await Employer.findOne({ 
            $or: [
                { username: usernameLower },
                { email: emailLower }
            ]
        });
        
        if (existingJobSeeker || existingEmployer) {
            return NextResponse.json({ message: 'User with this username or email already exists.' }, { status: 409 });
        }

        // 3. Hash the password
        const hashedPassword = await hashPassword(password);

        // 4. Generate email verification token
        const emailVerificationToken = generateSecureToken();
        const emailVerificationTokenExpiry = generateTokenExpiry(30); // 30 minutes

        // 5. Create user in the appropriate collection
        let newUser;
        if (role === 'job-seeker') {
            newUser = await JobSeeker.create({
                username: usernameLower,
                passwordHash: hashedPassword,
                firstName,
                lastName,
                email: emailLower,
                role: 'job-seeker',
                isEmailVerified: false,
                emailVerificationToken: emailVerificationToken || '',
                emailVerificationTokenExpiry: emailVerificationTokenExpiry || null,
            });
        } else {
            newUser = await Employer.create({
                username: usernameLower,
                passwordHash: hashedPassword,
                firstName,
                lastName,
                email: emailLower,
                role: 'employer',
                isEmailVerified: false,
                emailVerificationToken: emailVerificationToken || '',
                emailVerificationTokenExpiry: emailVerificationTokenExpiry || null,
            });
        }

        // 6. Send verification email
        try {
            await sendVerificationEmail(emailLower, emailVerificationToken, firstName);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Don't fail registration if email fails, but log it
        }

        // 7. Success response (NO auto-login - user must verify email first)
        return NextResponse.json(
            {
                message: 'Registration successful! Please check your email to verify your account.',
                user: {
                    id: newUser._id,
                    username: newUser.username,
                    firstName: newUser.firstName,
                    lastName: newUser.lastName,
                    role: newUser.role,
                    email: newUser.email,
                    isEmailVerified: false
                }
            },
            { status: 201 }
        );

    } catch (error) {
        console.error('Registration failed:', error);
        console.error('Error details:', error instanceof Error ? error.stack : error);

        let errorMessage = 'An unexpected error occurred during registration.';
        if (error instanceof Error) {
            errorMessage = error.message;
            // Check for common MongoDB errors
            if (error.message.includes('E11000')) {
                errorMessage = 'User with this username or email already exists.';
                return NextResponse.json({ message: errorMessage }, { status: 409 });
            }
            if (error.message.includes('validation')) {
                errorMessage = 'Invalid data provided. Please check all fields.';
                return NextResponse.json({ message: errorMessage }, { status: 400 });
            }
        }

        return NextResponse.json(
            { message: 'Registration failed. Please try again.', error: errorMessage },
            { status: 500 }
        );
    }
}