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

    // Verify user is an employer
    if (decoded.role !== 'employer') {
      return NextResponse.json({ message: 'Access denied. Employer profile only.' }, { status: 403 });
    }

    const dbConnect = (await import('@/lib/mongodb')).default;
    const Employer = (await import('@/lib/models/employer')).default;
    const mongoose = await import('mongoose');

    await dbConnect();

    // Convert userId to ObjectId if it's a string
    const userIdObjectId = typeof decoded.userId === 'string' 
      ? new mongoose.Types.ObjectId(decoded.userId) 
      : decoded.userId;

    // Retry operation for network resilience
    let employer;
    try {
      employer = await retryOperation(async () => {
        // Find employer by _id directly
        const profile = await Employer.findById(userIdObjectId);

        if (!profile) {
          throw new Error('Employer profile not found');
        }

        return profile;
      });
    } catch (error: any) {
      if (error.message === 'Employer profile not found') {
        return NextResponse.json({ message: 'Employer profile not found.' }, { status: 404 });
      }
      throw error;
    }

    const employerObj = employer.toObject({ virtuals: true });
    
    // Return employer data in the expected format
    const employerData = {
      name: employerObj.name || '',
      industry: employerObj.industry || '',
      size: employerObj.size || '',
      founded: employerObj.founded || '',
      location: employerObj.location || '',
      website: employerObj.website || '',
      linkedin: employerObj.linkedin || '',
      email: employerObj.email || '',
      phone: employerObj.phone || '',
      description: employerObj.description || '',
      mission: employerObj.mission || '',
      specialties: employerObj.specialties || [],
      photo: employerObj.photo || '',
    };

    return NextResponse.json(employerData, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching employer profile:', error);
    return NextResponse.json(
      { message: 'Internal server error while fetching employer profile.', error: error.message },
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

    // Verify user is an employer
    if (decoded.role !== 'employer') {
      return NextResponse.json({ message: 'Access denied. Employer profile only.' }, { status: 403 });
    }

    const data = await req.json();
    console.log('📥 Received employer profile update request:', {
      userId: decoded.userId,
      receivedFields: {
        name: data.name,
        industry: data.industry,
        location: data.location,
        size: data.size,
        founded: data.founded,
        website: data.website,
        linkedin: data.linkedin,
        email: data.email,
        phone: data.phone,
        description: data.description,
        mission: data.mission,
        specialties: data.specialties,
        photo: data.photo ? 'photo present' : 'no photo',
      }
    });

    const dbConnect = (await import('@/lib/mongodb')).default;
    const Employer = (await import('@/lib/models/employer')).default;
    const mongoose = await import('mongoose');

    await dbConnect();
    console.log('✅ Connected to MongoDB database: project');

    // Build update object - Map to Employer schema fields
    const updateFields: any = {};
    
    // Map employer fields to Employer schema
    updateFields.name = data.name !== undefined ? String(data.name).trim() : '';
    updateFields.industry = data.industry !== undefined ? String(data.industry).trim() : '';
    updateFields.size = data.size !== undefined ? String(data.size).trim() : '';
    updateFields.founded = data.founded !== undefined ? String(data.founded).trim() : '';
    updateFields.location = data.location !== undefined ? String(data.location).trim() : '';
    updateFields.website = data.website !== undefined ? String(data.website).trim() : '';
    updateFields.linkedin = data.linkedin !== undefined ? String(data.linkedin).trim() : '';
    updateFields.email = data.email !== undefined ? String(data.email).trim().toLowerCase() : '';
    updateFields.phone = data.phone !== undefined ? String(data.phone).trim() : '';
    updateFields.description = data.description !== undefined ? String(data.description).trim() : '';
    updateFields.mission = data.mission !== undefined ? String(data.mission).trim() : '';
    updateFields.specialties = data.specialties !== undefined && Array.isArray(data.specialties) 
      ? data.specialties.map((s: string) => String(s).trim()).filter(Boolean)
      : [];
    updateFields.photo = data.photo !== undefined ? String(data.photo) : '';

    // Check if profile is complete (at least name and industry)
    if (updateFields.name && updateFields.industry) {
      updateFields.isProfileComplete = true;
    } else {
      updateFields.isProfileComplete = false;
    }

    console.log('💾 Preparing to update employer profile with fields:', JSON.stringify(updateFields, null, 2));

    // Convert userId to ObjectId if it's a string
    const userIdObjectId = typeof decoded.userId === 'string' 
      ? new mongoose.Types.ObjectId(decoded.userId) 
      : decoded.userId;

    // Retry operation for network resilience
    let updatedEmployer;
    try {
      updatedEmployer = await retryOperation(async () => {
        // First verify the document exists
        const existing = await Employer.findById(userIdObjectId);
        if (!existing) {
          console.error('❌ Employer profile not found for userId:', userIdObjectId);
          throw new Error('Employer profile not found');
        }

        console.log('✅ Found existing employer profile, updating...');
        
        // Find and update employer by _id
        const result = await Employer.findByIdAndUpdate(
          userIdObjectId,
          { $set: updateFields },
          { new: true, runValidators: true }
        );

        if (!result) {
          throw new Error('Failed to update employer profile');
        }

        console.log('✅ Successfully updated in database, result:', {
          _id: result._id,
          name: result.name,
          industry: result.industry,
        });

        return result;
      });
    } catch (error: any) {
      console.error('❌ Error in retryOperation for employer update:', error);
      if (error.message === 'Employer profile not found') {
        return NextResponse.json({ message: 'Employer profile not found.' }, { status: 404 });
      }
      throw error;
    }

    const updatedEmployerObj = updatedEmployer.toObject({ virtuals: true });
    
    // Return employer-specific fields in the expected format
    const employerData = {
      name: updatedEmployerObj.name || '',
      industry: updatedEmployerObj.industry || '',
      size: updatedEmployerObj.size || '',
      founded: updatedEmployerObj.founded || '',
      location: updatedEmployerObj.location || '',
      website: updatedEmployerObj.website || '',
      linkedin: updatedEmployerObj.linkedin || '',
      email: updatedEmployerObj.email || '',
      phone: updatedEmployerObj.phone || '',
      description: updatedEmployerObj.description || '',
      mission: updatedEmployerObj.mission || '',
      specialties: updatedEmployerObj.specialties || [],
      photo: updatedEmployerObj.photo || '',
    };

    console.log('✅ Successfully updated employer profile:', {
      _id: updatedEmployerObj._id,
      name: employerData.name,
      industry: employerData.industry,
      location: employerData.location,
    });

    return NextResponse.json(employerData, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error updating employer profile:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        message: 'Internal server error while updating employer profile. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

