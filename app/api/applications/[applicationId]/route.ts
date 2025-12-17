// app/api/applications/[applicationId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Application from '@/lib/models/application';
import Job from '@/lib/models/job';
import JobSeeker from '@/lib/models/jobseeker';
import mongoose from 'mongoose';

// PATCH - Update application status or rating
export async function PATCH(
  req: NextRequest,
  { params }: { params: { applicationId: string } }
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

    // Only employers can update application status
    if (decoded.role !== 'employer') {
      return NextResponse.json({ message: 'Access denied. Only employers can update application status.' }, { status: 403 });
    }

    const data = await req.json();
    const { status, rating } = data;

    await dbConnect();

    const applicationIdObjectId = new mongoose.Types.ObjectId(params.applicationId);
    const employerIdObjectId = typeof decoded.userId === 'string' 
      ? new mongoose.Types.ObjectId(decoded.userId) 
      : decoded.userId;

    // Find application and verify job ownership
    const application = await Application.findById(applicationIdObjectId);
    if (!application) {
      return NextResponse.json({ message: 'Application not found.' }, { status: 404 });
    }

    // Verify the employer owns the job
    const job = await Job.findById(application.jobId);
    if (!job) {
      return NextResponse.json({ message: 'Job not found.' }, { status: 404 });
    }

    if (job.employerId.toString() !== employerIdObjectId.toString()) {
      return NextResponse.json({ message: 'Access denied. You can only update applications for your own jobs.' }, { status: 403 });
    }

    // Update application
    const updateFields: any = {};
    if (status && ['Pending', 'Reviewed', 'Shortlisted', 'Interviewed', 'Selected', 'Rejected'].includes(status)) {
      updateFields.status = status;
    }
    if (rating !== undefined && rating >= 0 && rating <= 5) {
      updateFields.rating = rating;
    }

    const updatedApplication = await Application.findByIdAndUpdate(
      applicationIdObjectId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedApplication) {
      return NextResponse.json({ message: 'Failed to update application.' }, { status: 500 });
    }

    // Also update the status/rating in jobseeker's appliedJobs array
    const jobSeekerIdObjectId = updatedApplication.jobSeekerId;
    const updateAppliedJobs: any = {};
    
    if (status && ['Pending', 'Reviewed', 'Shortlisted', 'Interviewed', 'Selected', 'Rejected'].includes(status)) {
      updateAppliedJobs['appliedJobs.$.status'] = status;
    }
    if (rating !== undefined && rating >= 0 && rating <= 5) {
      updateAppliedJobs['appliedJobs.$.rating'] = rating;
    }

    if (Object.keys(updateAppliedJobs).length > 0) {
      await JobSeeker.updateOne(
        { 
          _id: jobSeekerIdObjectId,
          'appliedJobs.applicationId': applicationIdObjectId 
        },
        { $set: updateAppliedJobs }
      );
    }

    const formattedApplication = {
      id: updatedApplication._id.toString(),
      jobId: updatedApplication.jobId.toString(),
      applicantId: updatedApplication.jobSeekerId.toString(),
      applicantName: updatedApplication.applicantName,
      applicantEmail: updatedApplication.applicantEmail,
      status: updatedApplication.status,
      appliedDate: updatedApplication.appliedDate ? new Date(updatedApplication.appliedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      resume: updatedApplication.resume || undefined,
      coverLetter: updatedApplication.coverLetter || undefined,
      rating: updatedApplication.rating,
    };

    return NextResponse.json(formattedApplication, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error updating application:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error while updating application.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
