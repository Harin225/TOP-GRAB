// app/api/my-applications/[applicationId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Application from '@/lib/models/application';
import Job from '@/lib/models/job';
import JobSeeker from '@/lib/models/jobseeker';
import mongoose from 'mongoose';

// DELETE - Remove an application from "My Applications" collection
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> | { applicationId: string } }
) {
  try {
    // Await params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params;
    const applicationId = resolvedParams.applicationId;
    
    console.log('🗑️ DELETE API called with applicationId:', applicationId);
    
    const token = req.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Authentication required.' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
    }

    // Verify user is a job seeker
    if (decoded.role !== 'job-seeker') {
      return NextResponse.json({ message: 'Access denied. Job seeker access only.' }, { status: 403 });
    }

    await dbConnect();

    // Validate applicationId format
    if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
      console.error('❌ Invalid applicationId format:', applicationId);
      return NextResponse.json({ 
        message: 'Invalid application ID format.' 
      }, { status: 400 });
    }

    let applicationIdObjectId: mongoose.Types.ObjectId;
    try {
      applicationIdObjectId = new mongoose.Types.ObjectId(applicationId);
    } catch (error: any) {
      console.error('❌ Error creating ObjectId from applicationId:', {
        applicationId: applicationId,
        error: error.message,
      });
      return NextResponse.json({ 
        message: 'Invalid application ID format.' 
      }, { status: 400 });
    }

    const jobSeekerIdObjectId = typeof decoded.userId === 'string' 
      ? new mongoose.Types.ObjectId(decoded.userId) 
      : decoded.userId;

    // Find the application and verify ownership
    const application = await Application.findById(applicationIdObjectId);
    if (!application) {
      return NextResponse.json({ message: 'Application not found.' }, { status: 404 });
    }

    // Verify the job seeker owns this application
    if (application.jobSeekerId.toString() !== jobSeekerIdObjectId.toString()) {
      return NextResponse.json({ message: 'Access denied. You can only remove your own applications.' }, { status: 403 });
    }

    // Store jobId before deletion for later use
    const jobIdObjectId = application.jobId;
    
    // Remove from jobseeker's appliedJobs array FIRST (before deleting Application)
    // This ensures we have the application data to match correctly
    let removedFromAppliedJobs = false;
    try {
      const jobSeeker = await JobSeeker.findById(jobSeekerIdObjectId);
      
      if (jobSeeker && jobSeeker.appliedJobs && Array.isArray(jobSeeker.appliedJobs)) {
        const initialLength = jobSeeker.appliedJobs.length;
        
        console.log('📋 Before removal - appliedJobs:', {
          count: initialLength,
          applicationIds: jobSeeker.appliedJobs.map((aj: any) => ({
            applicationId: aj.applicationId?.toString(),
            jobId: aj.jobId?.toString(),
            jobTitle: aj.jobTitle,
          })),
          targetApplicationId: applicationId,
          targetApplicationIdObjectId: applicationIdObjectId.toString(),
        });
        
        // Remove the application from the array by matching applicationId
        const filteredAppliedJobs = jobSeeker.appliedJobs.filter(
          (appliedJob: any) => {
            // Convert all IDs to strings for comparison
            const appliedJobAppId = appliedJob.applicationId 
              ? appliedJob.applicationId.toString() 
              : null;
            const targetAppId = applicationIdObjectId.toString();
            
            // Check if applicationId matches (primary method)
            if (appliedJobAppId && appliedJobAppId === targetAppId) {
              console.log('🎯 Found matching application to remove by applicationId:', {
                appliedJobAppId,
                targetAppId,
                jobTitle: appliedJob.jobTitle,
              });
              return false; // Remove this entry
            }
            
            // Fallback: check by jobId if applicationId doesn't match or doesn't exist
            // This handles cases where applicationId might not be set correctly
            const appliedJobJobId = appliedJob.jobId 
              ? appliedJob.jobId.toString() 
              : null;
            const targetJobId = jobIdObjectId.toString();
            
            if (appliedJobJobId && appliedJobJobId === targetJobId && !appliedJobAppId) {
              console.log('⚠️ Removing by jobId fallback (no applicationId found):', {
                jobId: appliedJobJobId,
                targetJobId,
                jobTitle: appliedJob.jobTitle,
              });
              return false; // Remove this entry
            }
            
            // Keep entries that don't match
            return true;
          }
        );
        
        jobSeeker.appliedJobs = filteredAppliedJobs;
        
        // Save the document to ensure changes persist
        const savedJobSeeker = await jobSeeker.save();
        
        const finalLength = savedJobSeeker.appliedJobs.length;
        removedFromAppliedJobs = initialLength > finalLength;
        
        console.log('✅ Removed from jobseeker appliedJobs:', {
          applicationId: applicationId,
          jobSeekerId: decoded.userId,
          initialLength,
          finalLength,
          removed: initialLength - finalLength,
          success: removedFromAppliedJobs,
        });
        
        // Verify the save worked
        const verifyJobSeeker = await JobSeeker.findById(jobSeekerIdObjectId).lean();
        const verifyLength = (verifyJobSeeker as any)?.appliedJobs?.length || 0;
        console.log('🔍 Verification - appliedJobs length after save:', verifyLength);
        
        // Check if removal actually happened
        if (!removedFromAppliedJobs) {
          console.error('❌ WARNING: Application was not removed from appliedJobs array!', {
            initialLength,
            finalLength,
            applicationId: applicationId,
            applicationIdObjectId: applicationIdObjectId.toString(),
            jobId: jobIdObjectId.toString(),
            appliedJobsEntries: initialLength > 0 ? jobSeeker.appliedJobs.map((aj: any) => ({
              applicationId: aj.applicationId?.toString() || 'MISSING',
              jobId: aj.jobId?.toString() || 'MISSING',
              jobTitle: aj.jobTitle || 'MISSING',
            })) : 'EMPTY ARRAY',
          });
          
          // Still try to delete the Application document even if not in appliedJobs
          // This handles edge cases where the application exists but isn't in appliedJobs
          console.log('⚠️ Application not found in appliedJobs, but continuing to delete Application document...');
          // Don't return error yet - continue to delete Application document
        }
        
      } else {
        console.warn('⚠️ Job seeker not found or has no appliedJobs array:', {
          jobSeekerFound: !!jobSeeker,
          hasAppliedJobs: !!(jobSeeker && jobSeeker.appliedJobs),
          isArray: Array.isArray(jobSeeker?.appliedJobs),
        });
        
        // If job seeker doesn't have appliedJobs array, we can still delete the Application
        // but warn about it
        console.warn('⚠️ Continuing with Application deletion even though appliedJobs array is missing');
      }
    } catch (updateError: any) {
      console.error('❌ Error removing from jobseeker appliedJobs:', {
        message: updateError.message,
        stack: updateError.stack,
        name: updateError.name,
        code: updateError.code,
      });
      // Don't continue with deletion if this fails - we want to keep the data consistent
      return NextResponse.json(
        { 
          message: 'Failed to remove application from your list. Please try again.',
          error: process.env.NODE_ENV === 'development' ? updateError.message : undefined
        },
        { status: 500 }
      );
    }
    
    // Delete from applications collection AFTER removing from appliedJobs
    await Application.findByIdAndDelete(applicationIdObjectId);
    
    // Update job applicant count (use stored jobIdObjectId since application is deleted)
    await Job.findByIdAndUpdate(
      jobIdObjectId,
      { $inc: { applicants: -1 } }
    );

    console.log('✅ Successfully deleted application:', {
      applicationId: applicationId,
      jobSeekerId: decoded.userId,
      jobId: jobIdObjectId.toString(),
      removedFromJobSeekerAppliedJobs: removedFromAppliedJobs,
    });

    return NextResponse.json({ 
      message: 'Application removed successfully.',
      applicationId: applicationId,
      removed: true,
    }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error deleting application from My Applications:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error while removing application.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
