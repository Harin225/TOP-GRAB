// app/api/applications/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Application from '@/lib/models/application';
import Job from '@/lib/models/job';
import JobSeeker from '@/lib/models/jobseeker';
import mongoose from 'mongoose';

// POST - Apply to a job
export async function POST(req: NextRequest) {
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
      return NextResponse.json({ message: 'Access denied. Only job seekers can apply.' }, { status: 403 });
    }

    const data = await req.json();
    const { jobId, coverLetter, resume } = data;

    console.log('📥 Received application request:', {
      jobId,
      jobIdType: typeof jobId,
      hasCoverLetter: !!coverLetter,
      hasResume: !!resume,
    });

    if (!jobId) {
      return NextResponse.json({ message: 'Job ID is required.' }, { status: 400 });
    }

    await dbConnect();

    const jobSeekerIdObjectId = typeof decoded.userId === 'string' 
      ? new mongoose.Types.ObjectId(decoded.userId) 
      : decoded.userId;

    // Handle jobId - should be a MongoDB ObjectId string
    let jobIdObjectId: mongoose.Types.ObjectId;
    
    // Validate and convert jobId to ObjectId
    if (typeof jobId !== 'string') {
      return NextResponse.json({ 
        message: 'Invalid job ID format. Expected MongoDB ObjectId string.' 
      }, { status: 400 });
    }
    
    // Check if it's a valid MongoDB ObjectId (24 hex characters)
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return NextResponse.json({ 
        message: 'Invalid job ID format. Please refresh the page and try again.' 
      }, { status: 400 });
    }
    
    if (jobId.length !== 24) {
      return NextResponse.json({ 
        message: 'Invalid job ID format. Expected 24-character MongoDB ObjectId.' 
      }, { status: 400 });
    }
    
    try {
      jobIdObjectId = new mongoose.Types.ObjectId(jobId);
    } catch (error: any) {
      console.error('❌ Error creating ObjectId from jobId:', {
        jobId,
        error: error.message,
      });
      return NextResponse.json({ 
        message: 'Invalid job ID format. Please refresh the page and try again.' 
      }, { status: 400 });
    }

    // Verify job exists and is active
    const job = await Job.findById(jobIdObjectId).lean();
    if (!job) {
      return NextResponse.json({ message: 'Job not found.' }, { status: 404 });
    }

    if (job.status !== 'Active') {
      return NextResponse.json({ message: 'This job is no longer accepting applications.' }, { status: 400 });
    }

    // Check if deadline has passed
    if (job.deadline) {
      const deadlineDate = new Date(job.deadline);
      const now = new Date();
      if (now > deadlineDate) {
        // Auto-close the job
        await Job.findByIdAndUpdate(jobIdObjectId, { status: 'Closed' });
        return NextResponse.json({ message: 'Application deadline has passed.' }, { status: 400 });
      }
    }

    // Check if already applied (both in Application collection and jobseeker's appliedJobs)
    const existingApplication = await Application.findOne({
      jobId: jobIdObjectId,
      jobSeekerId: jobSeekerIdObjectId,
    });

    if (existingApplication) {
      return NextResponse.json({ message: 'You have already applied to this job.' }, { status: 400 });
    }

    // Get job seeker details
    const jobSeeker = await JobSeeker.findById(jobSeekerIdObjectId);
    if (!jobSeeker) {
      return NextResponse.json({ message: 'Job seeker profile not found.' }, { status: 404 });
    }

    // Validate job seeker has required info
    if (!jobSeeker.firstName || !jobSeeker.lastName) {
      return NextResponse.json({ message: 'Job seeker profile is incomplete. Please complete your profile before applying.' }, { status: 400 });
    }

    // Also check in jobseeker's appliedJobs array
    if (jobSeeker.appliedJobs && jobSeeker.appliedJobs.length > 0) {
      const alreadyApplied = jobSeeker.appliedJobs.some(
        (appliedJob: any) => appliedJob.jobId && appliedJob.jobId.toString() === jobIdObjectId.toString()
      );
      if (alreadyApplied) {
        return NextResponse.json({ message: 'You have already applied to this job.' }, { status: 400 });
      }
    }

    // Create application
    const applicationData = {
      jobId: jobIdObjectId,
      jobSeekerId: jobSeekerIdObjectId,
      applicantName: `${jobSeeker.firstName} ${jobSeeker.lastName}`.trim(),
      applicantEmail: (jobSeeker.email || '').trim() || `${jobSeeker.username}@email.com`, // Fallback if no email
      status: 'Pending' as const,
      coverLetter: (coverLetter || '').trim(),
      resume: (resume || '').trim(),
      rating: 0,
      appliedDate: new Date(),
    };

    console.log('📝 Creating application with data:', {
      jobId: jobId,
      jobSeekerId: decoded.userId,
      applicantName: applicationData.applicantName,
      applicantEmail: applicationData.applicantEmail,
      hasCoverLetter: !!applicationData.coverLetter,
      hasResume: !!applicationData.resume,
    });

    const application = await Application.create(applicationData);

    // Update job applicant count
    const updatedJob = await Job.findByIdAndUpdate(
      jobIdObjectId, 
      { $inc: { applicants: 1 } },
      { new: true }
    );

    // Store job details in jobseeker's appliedJobs array
    const appliedJobData = {
      jobId: jobIdObjectId,
      applicationId: application._id,
      jobTitle: job.title,
      company: job.company,
      location: job.location,
      status: 'Pending' as const,
      appliedDate: new Date(),
      coverLetter: (coverLetter || '').trim(),
      resume: (resume || '').trim(),
      rating: 0,
    };

    console.log('📝 Attempting to store job details in jobseeker appliedJobs:', {
      jobSeekerId: decoded.userId,
      appliedJobData: {
        jobId: jobIdObjectId.toString(),
        applicationId: application._id.toString(),
        jobTitle: job.title,
        company: job.company,
        location: job.location,
      },
    });

    try {
      // Fetch the jobseeker document to ensure it exists and update it directly
      const jobSeekerDoc = await JobSeeker.findById(jobSeekerIdObjectId);
      
      if (!jobSeekerDoc) {
        console.error('❌ Job seeker not found for update');
        throw new Error('Job seeker not found');
      }

      // Initialize appliedJobs array if it doesn't exist (for existing profiles)
      if (!jobSeekerDoc.appliedJobs || !Array.isArray(jobSeekerDoc.appliedJobs)) {
        jobSeekerDoc.appliedJobs = [];
        // Save immediately to ensure the field exists in the database
        await jobSeekerDoc.save();
        console.log('✅ Initialized appliedJobs array for existing jobseeker profile');
      }

      // Check if already applied (prevent duplicates)
      const alreadyApplied = jobSeekerDoc.appliedJobs.some(
        (appliedJob: any) => appliedJob.jobId && appliedJob.jobId.toString() === jobIdObjectId.toString()
      );

      if (alreadyApplied) {
        console.log('⚠️ Job already in appliedJobs array, skipping duplicate');
      } else {
        // Add the new application to the array
        jobSeekerDoc.appliedJobs.push(appliedJobData);
        
        // Save the document - this will run validators and ensure data is persisted
        await jobSeekerDoc.save();

        console.log('✅ Job details stored in jobseeker appliedJobs:', {
          jobSeekerId: decoded.userId,
          appliedJobsCount: jobSeekerDoc.appliedJobs.length,
          latestJobTitle: jobSeekerDoc.appliedJobs[jobSeekerDoc.appliedJobs.length - 1]?.jobTitle,
          latestCompany: jobSeekerDoc.appliedJobs[jobSeekerDoc.appliedJobs.length - 1]?.company,
          latestJobId: jobSeekerDoc.appliedJobs[jobSeekerDoc.appliedJobs.length - 1]?.jobId?.toString(),
          latestApplicationId: jobSeekerDoc.appliedJobs[jobSeekerDoc.appliedJobs.length - 1]?.applicationId?.toString(),
        });

        // Verify the data was actually saved
        const latestJob = jobSeekerDoc.appliedJobs[jobSeekerDoc.appliedJobs.length - 1];
        if (!latestJob || latestJob.jobId?.toString() !== jobIdObjectId.toString()) {
          console.error('❌ WARNING: Latest job in appliedJobs does not match the job we just applied to!');
          console.error('Expected jobId:', jobIdObjectId.toString());
          console.error('Got jobId:', latestJob?.jobId?.toString());
        }
      }
    } catch (updateError: any) {
      console.error('❌ Error updating jobseeker appliedJobs:', {
        message: updateError.message,
        stack: updateError.stack,
        name: updateError.name,
        code: updateError.code,
      });
      // Don't throw - we still want to return success for the application creation
      // but log the error so we can debug
    }

    console.log('✅ Successfully created application:', {
      applicationId: application._id.toString(),
      jobId: jobId,
      jobSeekerId: decoded.userId,
      applicantName: application.applicantName,
      applicantEmail: application.applicantEmail,
      jobApplicantCount: updatedJob?.applicants || 0,
      applicationSaved: true,
      myApplicationSaved: true,
    });

    const formattedApplication = {
      id: application._id.toString(),
      jobId: application.jobId.toString(),
      applicantId: application.jobSeekerId.toString(),
      applicantName: application.applicantName,
      applicantEmail: application.applicantEmail,
      status: application.status,
      appliedDate: application.appliedDate ? new Date(application.appliedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      resume: application.resume || undefined,
      coverLetter: application.coverLetter || undefined,
      rating: application.rating,
    };

    return NextResponse.json(formattedApplication, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating application:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      receivedJobId: data?.jobId,
      jobIdType: typeof data?.jobId,
    });
    
    // Return a more helpful error message
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error while creating application. Please try again.';
    
    return NextResponse.json(
      { 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
          receivedJobId: data?.jobId,
        } : undefined
      },
      { status: 500 }
    );
  }
}

// GET - Get applications for a job (employer only)
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

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ message: 'Job ID is required.' }, { status: 400 });
    }

    await dbConnect();

    const jobIdObjectId = new mongoose.Types.ObjectId(jobId);

    // Verify job exists and employer owns it
    const job = await Job.findById(jobIdObjectId);
    if (!job) {
      return NextResponse.json({ message: 'Job not found.' }, { status: 404 });
    }

    // If employer, verify ownership
    if (decoded.role === 'employer') {
      const employerIdObjectId = typeof decoded.userId === 'string' 
        ? new mongoose.Types.ObjectId(decoded.userId) 
        : decoded.userId;

      if (job.employerId.toString() !== employerIdObjectId.toString()) {
        return NextResponse.json({ message: 'Access denied. You can only view applications for your own jobs.' }, { status: 403 });
      }
    }

    // Get all applications for this job (employer view)
    const applications = await Application.find({ jobId: jobIdObjectId })
      .sort({ appliedDate: -1 })
      .lean();

    console.log(`📋 Found ${applications.length} applications for job ${jobId}`);

    // Fetch job seeker details for each applicant (skills, bio, salary expectations)
    const formattedApplications = await Promise.all(
      applications.map(async (app: any) => {
        let applicantDetails: any = {
          skills: [],
          bio: '',
          salaryExpectation: '',
          title: '',
          location: '',
          photo: '',
        };

        try {
          // Fetch job seeker profile details
          const jobSeekerId = app.jobSeekerId.toString();
          const jobSeeker = await JobSeeker.findById(jobSeekerId)
            .select('skills bio salaryExpectation title location photo')
            .lean();

          if (jobSeeker) {
            applicantDetails = {
              skills: jobSeeker.skills || [],
              bio: jobSeeker.bio || '',
              salaryExpectation: jobSeeker.salaryExpectation || '',
              title: jobSeeker.title || '',
              location: jobSeeker.location || '',
              photo: jobSeeker.photo || '',
            };
          }
        } catch (error) {
          console.error(`Error fetching job seeker details for ${app.jobSeekerId}:`, error);
          // Continue with empty details if fetch fails
        }

        return {
          id: app._id.toString(),
          jobId: app.jobId.toString(),
          applicantId: app.jobSeekerId.toString(),
          applicantName: app.applicantName || 'Unknown Applicant',
          applicantEmail: app.applicantEmail || 'No email provided',
          status: app.status || 'Pending',
          appliedDate: app.appliedDate ? new Date(app.appliedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          resume: app.resume || undefined,
          coverLetter: app.coverLetter || undefined,
          rating: app.rating || 0,
          // Add applicant profile details
          skills: applicantDetails.skills,
          bio: applicantDetails.bio,
          salaryExpectation: applicantDetails.salaryExpectation,
          title: applicantDetails.title,
          location: applicantDetails.location,
          photo: applicantDetails.photo,
        };
      })
    );

    console.log(`✅ Returning ${formattedApplications.length} formatted applications with applicant details`);

    return NextResponse.json(formattedApplications, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching applications:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      jobId: searchParams.get('jobId'),
    });
    return NextResponse.json(
      { message: 'Internal server error while fetching applications.', error: error.message },
      { status: 500 }
    );
  }
}
