// app/api/jobs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Job from '@/lib/models/job';
import Employer from '@/lib/models/employer';
import mongoose from 'mongoose';

// GET - Fetch all active jobs (for job seekers)
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    // Auto-close jobs with expired deadlines
    const now = new Date();
    await Job.updateMany(
      { 
        status: 'Active',
        deadline: { $exists: true, $ne: null, $ne: '' },
        $expr: {
          $lt: [{ $dateFromString: { dateString: "$deadline" } }, now]
        }
      },
      { status: 'Closed' }
    ).catch(() => {
      // Fallback: simpler date comparison if $dateFromString fails
      const todayStr = now.toISOString().split('T')[0];
      return Job.updateMany(
        { 
          status: 'Active',
          deadline: { $exists: true, $ne: null, $ne: '', $lt: todayStr }
        },
        { status: 'Closed' }
      );
    });

    // Fetch only active jobs, sorted by postedDate (newest first)
    const jobs = await Job.find({ status: 'Active' })
      .sort({ postedDate: -1 })
      .lean();

    // Transform to match the frontend Job interface format
    const formattedJobs = jobs.map((job: any) => ({
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
    }));

    return NextResponse.json(formattedJobs, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { message: 'Internal server error while fetching jobs.', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new job (for employers)
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

    // Verify user is an employer
    if (decoded.role !== 'employer') {
      return NextResponse.json({ message: 'Access denied. Only employers can post jobs.' }, { status: 403 });
    }

    const data = await req.json();
    console.log('📥 Received job post request:', {
      userId: decoded.userId,
      title: data.title,
    });

    await dbConnect();

    // Fetch employer details to get company name
    const employerIdObjectId = typeof decoded.userId === 'string' 
      ? new mongoose.Types.ObjectId(decoded.userId) 
      : decoded.userId;

    const employer = await Employer.findById(employerIdObjectId);
    if (!employer) {
      return NextResponse.json({ message: 'Employer profile not found.' }, { status: 404 });
    }

    // Build job document
    const jobData: any = {
      employerId: employerIdObjectId,
      title: data.title?.trim() || '',
      company: data.company?.trim() || employer.name || 'Company Name',
      location: data.location?.trim() || '',
      salary: data.salary?.trim() || '',
      type: data.type?.trim() || 'Full-time',
      remote: data.remote || false,
      description: data.description?.trim() || '',
      requirements: Array.isArray(data.requirements) ? data.requirements.map((r: string) => String(r).trim()).filter(Boolean) : [],
      deadline: data.deadline?.trim() || undefined,
      status: data.status || 'Active',
      category: data.category?.trim() || data.type || '',
      experience: data.experience?.trim() || '',
      benefits: Array.isArray(data.benefits) ? data.benefits.map((b: string) => String(b).trim()).filter(Boolean) : [],
      companySize: data.companySize?.trim() || employer.size || '',
      industry: data.industry?.trim() || employer.industry || '',
      applicants: 0,
      postedDate: new Date(),
    };

    // Validate required fields
    if (!jobData.title || !jobData.description) {
      return NextResponse.json({ message: 'Title and description are required.' }, { status: 400 });
    }

    // Create the job
    const newJob = await Job.create(jobData);

    console.log('✅ Successfully created job:', {
      _id: newJob._id,
      title: newJob.title,
      company: newJob.company,
    });

    // Transform to match frontend format
    const formattedJob = {
      id: newJob._id.toString(),
      title: newJob.title,
      company: newJob.company,
      location: newJob.location,
      salary: newJob.salary || '',
      type: newJob.type,
      remote: newJob.remote || false,
      description: newJob.description,
      requirements: newJob.requirements || [],
      postedDate: newJob.postedDate ? new Date(newJob.postedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      deadline: newJob.deadline || undefined,
      applicants: newJob.applicants || 0,
      status: newJob.status || 'Active',
      employerId: newJob.employerId.toString(),
      category: newJob.category || '',
      experience: newJob.experience || '',
      benefits: newJob.benefits || [],
      companySize: newJob.companySize || '',
      industry: newJob.industry || '',
    };

    return NextResponse.json(formattedJob, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating job:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { 
        message: 'Internal server error while creating job. Please try again.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
