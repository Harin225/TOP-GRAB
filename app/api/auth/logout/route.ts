// app/api/auth/logout/route.ts

import { NextResponse } from 'next/server';

export async function POST() {
    const response = NextResponse.json(
        { message: 'Logout successful!' },
        { status: 200 }
    );
    
    // Clear the auth_token cookie
    response.cookies.set('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Expire immediately
        path: '/'
    });
    
    return response;
}

