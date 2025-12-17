// app/api/jobs/employer/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Job from '@/lib/models/job';
import Application from '@/lib/models/application';
import mongoose from 'mongoose';

// GET - Fetch all jobs posted by the authenticated employer
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
      return NextResponse.json({ message: 'Access denied. Employer access only.' }, { status: 403 });
    }

    await dbConnect();

    const employerIdObjectId = typeof decoded.userId === 'string' 
      ? new mongoose.Types.ObjectId(decoded.userId) 
      : decoded.userId;

    // Fetch all jobs by this employer, sorted by postedDate (newest first)
    const jobs = await Job.find({ employerId: employerIdObjectId })
      .sort({ postedDate: -1 })
      .lean();

    // Get application counts for each job
    const jobsWithApplicants = await Promise.all(
      jobs.map(async (job: any) => {
        const applicantCount = await Application.countDocuments({ jobId: job._id });
        const pendingCount = await Application.countDocuments({ jobId: job._id, status: 'Pending' });
        
        // Check if deadline has passed and job is still Active
        let status = job.status;
        if (status === 'Active' && job.deadline) {
          const deadlineDate = new Date(job.deadline);
          const now = new Date();
          if (now > deadlineDate) {
            status = 'Closed';
            // Update job status in database (async, don't wait)
            Job.findByIdAndUpdate(job._id, { status: 'Closed' }).catch(console.error);
          }
        }

        return {
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
          applicants: applicantCount, // Real count from applications
          pendingApplications: pendingCount,
          status: status,
          employerId: job.employerId ? job.employerId.toString() : '',
          category: job.category || '',
          experience: job.experience || '',
          benefits: job.benefits || [],
          companySize: job.companySize || '',
          industry: job.industry || '',
        };
      })
    );

    return NextResponse.json(jobsWithApplicants, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching employer jobs:', error);
    return NextResponse.json(
      { message: 'Internal server error while fetching jobs.', error: error.message },
      { status: 500 }
    );
  }
}
