// app/api/my-applications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Application from '@/lib/models/application';
import JobSeeker from '@/lib/models/jobseeker';
import mongoose from 'mongoose';

// GET - Get all applications for the authenticated job seeker from their appliedJobs array
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

    // Verify user is a job seeker
    if (decoded.role !== 'job-seeker') {
      return NextResponse.json({ message: 'Access denied. Job seeker access only.' }, { status: 403 });
    }

    await dbConnect();

    const jobSeekerIdObjectId = typeof decoded.userId === 'string' 
      ? new mongoose.Types.ObjectId(decoded.userId) 
      : decoded.userId;

    // Fetch job seeker with appliedJobs array
    const jobSeeker = await JobSeeker.findById(jobSeekerIdObjectId).lean();

    if (!jobSeeker) {
      return NextResponse.json({ message: 'Job seeker profile not found.' }, { status: 404 });
    }

    // Get appliedJobs from jobseeker document
    // If field doesn't exist, initialize it (for existing profiles)
    let appliedJobs = (jobSeeker as any).appliedJobs || [];
    
    // If appliedJobs field doesn't exist in the document, initialize it
    if (!('appliedJobs' in jobSeeker)) {
      // Initialize the field in the database for this user
      await JobSeeker.findByIdAndUpdate(
        jobSeekerIdObjectId,
        { $set: { appliedJobs: [] } },
        { upsert: false }
      ).catch(() => {
        // If update fails, continue with empty array
        console.warn('⚠️ Could not initialize appliedJobs field for job seeker');
      });
      appliedJobs = [];
    }

    console.log(`📋 Job seeker data for ${decoded.userId}:`, {
      hasAppliedJobs: 'appliedJobs' in jobSeeker,
      appliedJobsType: typeof (jobSeeker as any).appliedJobs,
      appliedJobsLength: Array.isArray((jobSeeker as any).appliedJobs) ? (jobSeeker as any).appliedJobs.length : 'not an array',
      appliedJobsSample: appliedJobs.length > 0 ? appliedJobs[0] : null,
    });

    console.log(`📋 Found ${appliedJobs.length} total entries in appliedJobs array for job seeker ${decoded.userId}`);

    // Only return applications from the jobseeker's appliedJobs array (database entries only)
    // Filter out any invalid entries and ensure we only show real database applications
    const validAppliedJobs = appliedJobs.filter((appliedJob: any) => {
      // Only include entries that have valid jobId and applicationId (real database entries)
      // Must have all required fields to be considered valid
      const isValid = appliedJob && 
             appliedJob.jobId && 
             appliedJob.applicationId &&
             appliedJob.jobTitle && 
             appliedJob.company &&
             // Ensure jobId and applicationId are ObjectIds (not numbers)
             typeof appliedJob.jobId !== 'number' &&
             typeof appliedJob.applicationId !== 'number';
      
      if (!isValid && appliedJob) {
        console.warn('⚠️ Filtered out invalid applied job entry:', {
          hasJobId: !!appliedJob.jobId,
          hasApplicationId: !!appliedJob.applicationId,
          hasJobTitle: !!appliedJob.jobTitle,
          hasCompany: !!appliedJob.company,
          jobIdType: typeof appliedJob.jobId,
          applicationIdType: typeof appliedJob.applicationId,
        });
      }
      
      return isValid;
    });

    console.log(`✅ Filtered to ${validAppliedJobs.length} valid applied jobs from database (excluded ${appliedJobs.length - validAppliedJobs.length} invalid/mock entries)`);

    // Sync status from Application collection to ensure accuracy (only for valid applications)
    const applicationIds = validAppliedJobs
      .map((app: any) => app.applicationId?.toString())
      .filter(Boolean);

    // Create a map of applicationId -> status for quick lookup
    const statusMap = new Map();
    if (applicationIds.length > 0) {
      const applications = await Application.find({
        _id: { $in: applicationIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
        jobSeekerId: jobSeekerIdObjectId, // Ensure we only get applications for this job seeker
      }).lean();

      applications.forEach((app: any) => {
        statusMap.set(app._id.toString(), {
          status: app.status || 'Pending',
          rating: app.rating || 0,
        });
      });
    }

    // Format applied jobs with job details from jobseeker's appliedJobs array
    // ONLY return applications that are in the appliedJobs array (database entries)
    const formattedApplications = validAppliedJobs.map((appliedJob: any) => {
      // Get latest status from Application collection if available
      const applicationStatus = appliedJob.applicationId 
        ? statusMap.get(appliedJob.applicationId.toString())
        : null;

      return {
        id: appliedJob.applicationId.toString(),
        applicationId: appliedJob.applicationId.toString(),
        jobId: appliedJob.jobId.toString(),
        jobTitle: appliedJob.jobTitle,
        company: appliedJob.company,
        location: appliedJob.location || 'Unknown Location',
        status: applicationStatus?.status || appliedJob.status || 'Pending',
        appliedDate: appliedJob.appliedDate 
          ? new Date(appliedJob.appliedDate).toISOString().split('T')[0] 
          : new Date().toISOString().split('T')[0],
        resume: appliedJob.resume || undefined,
        coverLetter: appliedJob.coverLetter || undefined,
        rating: applicationStatus?.rating || appliedJob.rating || 0,
      };
    }).sort((a: any, b: any) => {
      // Sort by appliedDate descending (most recent first)
      return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
    });

    console.log(`✅ Returning ${formattedApplications.length} applications from jobseeker's appliedJobs array`);

    return NextResponse.json(formattedApplications, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching my applications:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { message: 'Internal server error while fetching applications.', error: error.message },
      { status: 500 }
    );
  }
}
