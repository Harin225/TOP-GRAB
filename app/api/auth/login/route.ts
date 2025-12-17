// app/api/auth/login/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import JobSeeker from '@/lib/models/jobseeker';
import Employer from '@/lib/models/employer';
import { verifyPassword, createToken } from '@/lib/auth';

export async function POST(request: Request) {
    await dbConnect();

    try {
        const data = await request.json();
        const { username, password, role } = data;

        // 1. Validation
        if (!username || !password) {
            return NextResponse.json({ message: 'Username and password are required.' }, { status: 400 });
        }

        const usernameLower = username.toLowerCase();

        // 2. Find user in the appropriate collection
        // If role is provided, check that specific collection first
        // Otherwise, check both collections
        let user = null;
        
        if (role === 'job-seeker') {
            user = await JobSeeker.findOne({ username: usernameLower });
        } else if (role === 'employer') {
            user = await Employer.findOne({ username: usernameLower });
        } else {
            // No role specified, check both collections
            user = await JobSeeker.findOne({ username: usernameLower });
            if (!user) {
                user = await Employer.findOne({ username: usernameLower });
            }
        }

        if (!user) {
            return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
        }

        // 3. Verify Password
        const isValid = await verifyPassword(password, user.passwordHash);

        if (!isValid) {
            return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
        }

        // 4. Create and Issue JWT
        const token = createToken({ 
            userId: user._id.toString(), 
            role: user.role, 
            username: user.username 
        });

        // 5. Success Response
        const response = NextResponse.json(
            { 
                message: 'Login successful!',
                user: { 
                    id: user._id, 
                    username: user.username, 
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role 
                }
            },
            { status: 200 }
        );
        
        // Set the token as a secure, HttpOnly cookie
        response.cookies.set('auth_token', token, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });
        
        console.log('[Login] Cookie set successfully for user:', user.username, 'Role:', user.role);
        
        return response;

    } catch (error) {
        console.error('Login failed:', error);
        
        let errorMessage = 'An unexpected error occurred during login.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        
        return NextResponse.json({ message: 'An unexpected error occurred during login.', error: errorMessage }, { status: 500 });
    }
}