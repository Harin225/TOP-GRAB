// app/api/jobs/[jobId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Job from '@/lib/models/job';
import Application from '@/lib/models/application';
import JobSeeker from '@/lib/models/jobseeker';
import mongoose from 'mongoose';

// GET - Get a single job by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    await dbConnect();

    const jobIdObjectId = new mongoose.Types.ObjectId(params.jobId);
    const job = await Job.findById(jobIdObjectId).lean();

    if (!job) {
      return NextResponse.json({ message: 'Job not found.' }, { status: 404 });
    }

    // Transform to match frontend format
    const formattedJob = {
      id: job._id.toString(),
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary || '',
      type: job.type,
      remote: job.remote || false,
      description: job.description,
      requirements: job.requirements || [],
      postedDate: job.postedDate ? new Date(job.postedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      deadline: job.deadline || undefined,
      applicants: job.applicants || 0,
      status: job.status || 'Active',
      employerId: job.employerId ? job.employerId.toString() : '',
      category: job.category || '',
      experience: job.experience || '',
      benefits: job.benefits || [],
      companySize: job.companySize || '',
      industry: job.industry || '',
    };

    return NextResponse.json(formattedJob, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { message: 'Internal server error while fetching job.', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a job (only by the employer who posted it)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
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
      return NextResponse.json({ message: 'Access denied. Only employers can delete jobs.' }, { status: 403 });
    }

    await dbConnect();

    const jobIdObjectId = new mongoose.Types.ObjectId(params.jobId);
    const employerIdObjectId = typeof decoded.userId === 'string' 
      ? new mongoose.Types.ObjectId(decoded.userId) 
      : decoded.userId;

    // Find the job and verify ownership
    const job = await Job.findById(jobIdObjectId);
    if (!job) {
      return NextResponse.json({ message: 'Job not found.' }, { status: 404 });
    }

    // Verify the employer owns this job
    if (job.employerId.toString() !== employerIdObjectId.toString()) {
      return NextResponse.json({ message: 'Access denied. You can only delete your own jobs.' }, { status: 403 });
    }

    // Get all applications for this job before deleting
    const applications = await Application.find({ jobId: jobIdObjectId });
    const applicationIds = applications.map(app => app._id);
    const jobSeekerIds = [...new Set(applications.map(app => app.jobSeekerId.toString()))];

    console.log('📋 Found applications to clean up:', {
      applicationCount: applications.length,
      jobSeekerCount: jobSeekerIds.length,
    });

    // Remove applications from all job seekers' appliedJobs arrays
    for (const jobSeekerIdStr of jobSeekerIds) {
      try {
        const jobSeekerIdObjectId = new mongoose.Types.ObjectId(jobSeekerIdStr);
        const jobSeeker = await JobSeeker.findById(jobSeekerIdObjectId);
        
        if (jobSeeker && jobSeeker.appliedJobs) {
          // Remove all applications for this job from the job seeker's appliedJobs array
          const initialLength = jobSeeker.appliedJobs.length;
          jobSeeker.appliedJobs = jobSeeker.appliedJobs.filter(
            (appliedJob: any) => appliedJob.jobId && appliedJob.jobId.toString() !== jobIdObjectId.toString()
          );
          
          if (jobSeeker.appliedJobs.length !== initialLength) {
            await jobSeeker.save();
            console.log(`✅ Removed applications from job seeker ${jobSeekerIdStr}:`, {
              removed: initialLength - jobSeeker.appliedJobs.length,
            });
          }
        }
      } catch (error: any) {
        console.error(`❌ Error removing applications from job seeker ${jobSeekerIdStr}:`, error.message);
      }
    }

    // Delete all applications for this job from applications collection
    const deleteApplicationsResult = await Application.deleteMany({ jobId: jobIdObjectId });
    console.log('✅ Deleted applications from applications collection:', {
      deletedCount: deleteApplicationsResult.deletedCount,
    });

    // Delete the job
    await Job.findByIdAndDelete(jobIdObjectId);

    console.log('✅ Successfully deleted job:', {
      jobId: params.jobId,
      employerId: decoded.userId,
      applicationsDeleted: deleteApplicationsResult.deletedCount,
      jobSeekersUpdated: jobSeekerIds.length,
    });

    return NextResponse.json({ message: 'Job deleted successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error deleting job:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error while deleting job.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
