// lib/db-user.ts

import dbConnect from '@/lib/mongodb';
import JobSeeker from '@/lib/models/jobseeker';
import Employer from '@/lib/models/employer';
import mongoose from 'mongoose';

/**
 * Fetches user profile data based on role, excluding the password hash.
 * @param userId The ObjectId of the user.
 * @param role The role of the user ('job-seeker' or 'employer').
 * @returns A user object with safe fields, or null.
 */
export async function findUserSafeById(userId: string, role?: 'job-seeker' | 'employer') {
  await dbConnect();
  
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  const userIdObjectId = new mongoose.Types.ObjectId(userId);

  try {
    let user;
    if (role === 'job-seeker') {
      user = await JobSeeker.findById(userIdObjectId).select('-passwordHash').exec();
    } else if (role === 'employer') {
      user = await Employer.findById(userIdObjectId).select('-passwordHash').exec();
    } else {
      // Try both if role not specified
      user = await JobSeeker.findById(userIdObjectId).select('-passwordHash').exec();
      if (!user) {
        user = await Employer.findById(userIdObjectId).select('-passwordHash').exec();
      }
    }

    if (!user) {
      return null;
    }

    // Return a plain object version of the user document
    return user.toObject({ virtuals: true });
  } catch (error) {
    console.error('Error finding user by ID:', error);
    return null;
  }
}