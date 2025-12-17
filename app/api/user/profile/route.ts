import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
    }

    const dbConnect = (await import('@/lib/mongodb')).default;
    const mongoose = await import('mongoose');

    await dbConnect();

    // Convert userId to ObjectId
    const userIdObjectId = typeof decoded.userId === 'string' 
      ? new mongoose.Types.ObjectId(decoded.userId) 
      : decoded.userId;

    // Fetch from appropriate collection based on role
    let userProfile;
    if (decoded.role === 'job-seeker') {
      const JobSeeker = (await import('@/lib/models/jobseeker')).default;
      const profile = await JobSeeker.findById(userIdObjectId).select('-passwordHash');
      if (!profile) {
        return NextResponse.json({ message: 'User not found.' }, { status: 404 });
      }
      userProfile = profile.toObject({ virtuals: true });
    } else if (decoded.role === 'employer') {
      const Employer = (await import('@/lib/models/employer')).default;
      const profile = await Employer.findById(userIdObjectId).select('-passwordHash');
      if (!profile) {
        return NextResponse.json({ message: 'User not found.' }, { status: 404 });
      }
      userProfile = profile.toObject({ virtuals: true });
    } else {
      return NextResponse.json({ message: 'Invalid role.' }, { status: 400 });
    }

    return NextResponse.json(userProfile, { status: 200 });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { message: 'Internal server error while fetching profile.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
    }

    const data = await req.json();

    const dbConnect = (await import('@/lib/mongodb')).default;
    const mongoose = await import('mongoose');

    await dbConnect();

    // Convert userId to ObjectId
    const userIdObjectId = typeof decoded.userId === 'string' 
      ? new mongoose.Types.ObjectId(decoded.userId) 
      : decoded.userId;

    // Update based on role - only firstName and lastName for this endpoint
    const updateFields: any = {};
    if (data.firstName !== undefined) updateFields.firstName = String(data.firstName).trim();
    if (data.lastName !== undefined) updateFields.lastName = String(data.lastName).trim();

    let updatedUser;
    if (decoded.role === 'job-seeker') {
      const JobSeeker = (await import('@/lib/models/jobseeker')).default;
      updatedUser = await JobSeeker.findByIdAndUpdate(
        userIdObjectId,
        { $set: updateFields },
        { new: true, select: '-passwordHash', runValidators: true }
      );
    } else if (decoded.role === 'employer') {
      const Employer = (await import('@/lib/models/employer')).default;
      updatedUser = await Employer.findByIdAndUpdate(
        userIdObjectId,
        { $set: updateFields },
        { new: true, select: '-passwordHash', runValidators: true }
      );
    } else {
      return NextResponse.json({ message: 'Invalid role.' }, { status: 400 });
    }

    if (!updatedUser) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    const updatedUserObj = updatedUser.toObject({ virtuals: true });
    return NextResponse.json(updatedUserObj, { status: 200 });
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error while updating profile.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
