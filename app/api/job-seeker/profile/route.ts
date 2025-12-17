import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Retry function for database operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      // Don't retry on validation errors or authentication errors
      if (error.name === 'ValidationError' || error.name === 'CastError' || error.status === 401 || error.status === 403) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  throw lastError;
}

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
    const JobSeeker = (await import('@/lib/models/jobseeker')).default;
    const mongoose = await import('mongoose');

    await dbConnect();

    // Check if an ID is provided in query params (for employers viewing applicants)
    const { searchParams } = new URL(req.url);
    const requestedId = searchParams.get('id');

    let userIdObjectId: mongoose.Types.ObjectId;

    if (requestedId) {
      // If ID is provided and user is an employer, allow them to view the profile
      if (decoded.role !== 'employer') {
        return NextResponse.json({ message: 'Access denied. Only employers can view other profiles by ID.' }, { status: 403 });
      }
      userIdObjectId = new mongoose.Types.ObjectId(requestedId);
    } else {
      // Otherwise, user must be a job-seeker viewing their own profile
      if (decoded.role !== 'job-seeker') {
        return NextResponse.json({ message: 'Access denied. Job seeker profile only.' }, { status: 403 });
      }
      // Convert userId to ObjectId if it's a string
      userIdObjectId = typeof decoded.userId === 'string' 
        ? new mongoose.Types.ObjectId(decoded.userId) 
        : decoded.userId;
    }

    // Retry operation for network resilience
    let jobseeker;
    try {
      jobseeker = await retryOperation(async () => {
        // Find jobseeker by _id directly
        const profile = await JobSeeker.findById(userIdObjectId).select('firstName lastName email phone location title skills photo');

        if (!profile) {
          throw new Error('Job seeker profile not found');
        }

        return profile;
      });
    } catch (error: any) {
      if (error.message === 'Job seeker profile not found') {
        return NextResponse.json({ message: 'Job seeker profile not found.' }, { status: 404 });
      }
      throw error;
    }

    const jobseekerObj = jobseeker.toObject({ virtuals: true });
    
    return NextResponse.json(jobseekerObj, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching jobseeker profile:', error);
    return NextResponse.json(
      { message: 'Internal server error while fetching jobseeker profile.', error: error.message },
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

    // Verify user is a job-seeker
    if (decoded.role !== 'job-seeker') {
      return NextResponse.json({ message: 'Access denied. Job seeker profile only.' }, { status: 403 });
    }

    const data = await req.json();
    console.log('📥 Received jobseeker profile update request:', {
      userId: decoded.userId,
      receivedFields: {
        firstName: data.firstName,
        lastName: data.lastName,
        title: data.title,
        email: data.email,
        phone: data.phone,
        location: data.location,
        skills: data.skills,
        bio: data.bio,
        photo: data.photo ? 'photo present' : 'no photo',
      }
    });

    const dbConnect = (await import('@/lib/mongodb')).default;
    const JobSeeker = (await import('@/lib/models/jobseeker')).default;
    const mongoose = await import('mongoose');

    await dbConnect();
    console.log('✅ Connected to MongoDB database: project');

    // Build update object - Map to JobSeeker schema fields
    const updateFields: any = {};
    
    // Required basic fields
    updateFields.firstName = data.firstName !== undefined ? String(data.firstName).trim() : '';
    updateFields.lastName = data.lastName !== undefined ? String(data.lastName).trim() : '';
    
    // Contact fields - now stored in jobseeker collection
    updateFields.email = data.email !== undefined ? String(data.email).trim().toLowerCase() : '';
    updateFields.phone = data.phone !== undefined ? String(data.phone).trim() : '';
    updateFields.location = data.location !== undefined ? String(data.location).trim() : '';
    
    // Job seeker specific fields
    updateFields.title = data.title !== undefined ? String(data.title).trim() : '';
    updateFields.bio = data.bio !== undefined ? String(data.bio).trim() : '';
    
    // Handle skills array
    if (data.skills !== undefined) {
      if (Array.isArray(data.skills)) {
        updateFields.skills = data.skills
          .map((s: string) => String(s).trim())
          .filter((s: string) => s.length > 0);
      } else {
        updateFields.skills = [];
      }
    } else {
      updateFields.skills = [];
    }
    
    updateFields.website = data.website !== undefined ? String(data.website).trim() : '';
    updateFields.linkedin = data.linkedin !== undefined ? String(data.linkedin).trim() : '';
    updateFields.github = data.github !== undefined ? String(data.github).trim() : '';
    updateFields.availability = data.availability !== undefined ? String(data.availability).trim() : '';
    updateFields.salaryExpectation = data.salaryExpectation !== undefined ? String(data.salaryExpectation).trim() : '';
    updateFields.photo = data.photo !== undefined ? String(data.photo) : '';

    // Check if profile is complete (at least firstName, lastName, and title)
    if (updateFields.firstName && updateFields.lastName && updateFields.title) {
      updateFields.isProfileComplete = true;
    } else {
      updateFields.isProfileComplete = false;
    }

    console.log('💾 Preparing to update jobseeker profile with fields:', {
      firstName: updateFields.firstName,
      lastName: updateFields.lastName,
      email: updateFields.email,
      phone: updateFields.phone,
      location: updateFields.location,
      title: updateFields.title,
      skills: updateFields.skills,
      skillsCount: updateFields.skills.length,
    });

    // Convert userId to ObjectId if it's a string
    const userIdObjectId = typeof decoded.userId === 'string' 
      ? new mongoose.Types.ObjectId(decoded.userId) 
      : decoded.userId;

    // Retry operation for network resilience
    let updatedJobSeeker;
    try {
      updatedJobSeeker = await retryOperation(async () => {
        // First verify the document exists
        const existing = await JobSeeker.findById(userIdObjectId);
        if (!existing) {
          console.error('❌ Job seeker profile not found for userId:', userIdObjectId);
          throw new Error('Job seeker profile not found');
        }

        console.log('✅ Found existing jobseeker profile, updating...');
        
        // Find and update jobseeker by _id
        const result = await JobSeeker.findByIdAndUpdate(
          userIdObjectId,
          { $set: updateFields },
          { new: true, runValidators: true }
        );

        if (!result) {
          throw new Error('Failed to update jobseeker profile');
        }

        console.log('✅ Successfully updated in database, result:', {
          _id: result._id,
          firstName: result.firstName,
          lastName: result.lastName,
        });

        return result;
      });
    } catch (error: any) {
      console.error('❌ Error in retryOperation for jobseeker update:', error);
      if (error.message === 'Job seeker profile not found') {
        return NextResponse.json({ message: 'Job seeker profile not found.' }, { status: 404 });
      }
      throw error;
    }

    const updatedJobSeekerObj = updatedJobSeeker.toObject({ virtuals: true });
    
    console.log('✅ Successfully updated jobseeker profile:', {
      _id: updatedJobSeekerObj._id,
      firstName: updatedJobSeekerObj.firstName,
      lastName: updatedJobSeekerObj.lastName,
      email: updatedJobSeekerObj.email,
      phone: updatedJobSeekerObj.phone,
      location: updatedJobSeekerObj.location,
      title: updatedJobSeekerObj.title,
      skills: updatedJobSeekerObj.skills,
      skillsCount: updatedJobSeekerObj.skills ? updatedJobSeekerObj.skills.length : 0,
    });

    return NextResponse.json(updatedJobSeekerObj, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error updating jobseeker profile:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        message: 'Internal server error while updating jobseeker profile. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
