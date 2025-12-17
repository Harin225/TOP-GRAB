// app/api/test/route.ts (FIXED TypeScript Error Handling)

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb'; 
import User from '@/lib/models/user'; 

export async function GET() {
  await dbConnect(); 

  try {
    // --- Test 1: Count existing users ---
    const userCount = await User.countDocuments({});

    // --- Test 2: Attempt to create a new test user (will only succeed once) ---
    const testUsername = 'testuser123';
    const existingUser = await User.findOne({ username: testUsername });

    let message = `MongoDB connection successful! Total users: ${userCount}.`;

    if (!existingUser) {
        await User.create({
            username: testUsername,
            passwordHash: 'placeholder-hash-for-test', 
            firstName: 'Test',
            lastName: 'User',
            role: 'job-seeker',
        });
        message = `MongoDB connection successful! Created test user: ${testUsername}.`;
    } else {
        message += ` Test user '${testUsername}' already exists.`;
    }

    return NextResponse.json({ 
      message: message, 
    }, { status: 200 });

  } catch (error) {
    console.error('MongoDB connection or query failed:', error);
    
    // --- FIX FOR TYPESCRIPT ERROR ---
    let errorMessage = 'An unknown error occurred.';
    
    if (error instanceof Error) {
        // If it's a standard Error object, we can safely access .message
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        // If the error is just a string
        errorMessage = error;
    }
    // ---------------------------------

    return NextResponse.json({ 
      message: 'Failed to connect to or query MongoDB.', 
      error: errorMessage // Now using the safely typed errorMessage
    }, { status: 500 });
  }
}