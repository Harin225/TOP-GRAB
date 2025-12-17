import { NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Job from '@/lib/models/job'
import JobSeeker from '@/lib/models/jobseeker'
import Employer from '@/lib/models/employer'

export async function GET() {
  try {
    await dbConnect()

    const [activeJobs, jobSeekerCount, employerCount] = await Promise.all([
      Job.countDocuments({ status: 'Active' }),
      JobSeeker.countDocuments({}),
      Employer.countDocuments({}),
    ])

    return NextResponse.json({
      jobs: activeJobs,
      jobSeekers: jobSeekerCount,
      companies: employerCount,
    })
  } catch (error) {
    console.error('Failed to load stats:', error)
    return NextResponse.json({
      jobs: 0,
      jobSeekers: 0,
      companies: 0,
      message: 'Unable to load stats',
    }, { status: 500 })
  }
}
