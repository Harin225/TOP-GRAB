// middleware.ts (FIXED - Removed JWT verification from Edge runtime)

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// NOTE: Middleware runs in Edge runtime which doesn't support Node.js crypto module
// We'll do basic cookie check here, and proper token verification in API routes

// Define the paths that MUST require authentication
const protectedRoutes = ['/job-seeker/profile', '/employer/profile', '/api/user/profile', '/settings', '/api/user/settings'];

// Define paths that are PUBLIC (login, register, home, etc.)
const publicRoutes = [
    '/auth/login/job-seeker', 
    '/auth/login/employer', 
    '/auth/register/job-seeker', 
    '/auth/register/employer',
    '/',
    '/terms',
    '/privacy',
];

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const token = request.cookies.get('auth_token')?.value;
    
    // 1. Check if the current path is a protected route
    const isProtectedRoute = protectedRoutes.some(route => 
        pathname.startsWith(route)
    );
    
    // Check if the current path is a public route
    const isPublicRoute = publicRoutes.includes(pathname);

    // --- Core Logic: Handle Protected Routes ---
    // NOTE: We only check for cookie presence here, not validity
    // Actual token verification happens in the page/API route which runs in Node.js runtime
    if (isProtectedRoute) {
        if (!token) {
            // No cookie present: Redirect to login
            const loginUrl = pathname.startsWith('/job-seeker') 
                ? '/auth/login/job-seeker' 
                : '/auth/login/employer';

            return NextResponse.redirect(new URL(loginUrl, request.url));
        }
        
        // Cookie exists - allow request to proceed
        // The actual page/API will verify the token validity
        return NextResponse.next();
    }
    
    // --- Logic for Logged-In Users accessing Public Routes ---
    // Only redirect from login/register pages if cookie exists (assuming valid auth)
    if (token && isPublicRoute && (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register'))) {
        // If cookie exists, redirect away from login/register
        // We can't verify token here, but if cookie exists, assume user wants dashboard
        const redirectPath = pathname.includes('job-seeker') ? '/job-seeker' : '/employer';
        return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    // Allow all other requests (unprotected, public, static files) to proceed
    return NextResponse.next();
}

// Configuration: Match all requests that could be dynamic or file requests
export const config = {
  // Exclude static assets and next internal files, but match everything else
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|public/).*)'],
};