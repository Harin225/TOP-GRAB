// lib/models/jobseeker.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IJobSeeker extends Document {
  // Authentication fields
  username: string;
  passwordHash: string;
  role: 'job-seeker';
  
  // Email verification fields
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpiry?: Date;
  
  // Password reset fields
  passwordResetToken?: string;
  passwordResetTokenExpiry?: Date;
  
  // Basic profile fields
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  location?: string;
  
  // Job seeker specific fields
  title?: string;
  bio?: string;
  skills: string[];
  website?: string;
  linkedin?: string;
  github?: string;
  availability?: string;
  salaryExpectation?: string;
  photo?: string; // Photo stored as base64 string or URL
  resumeUrl?: string; 
  isProfileComplete: boolean;
  
  // Applied jobs - stores job ID and job details
  appliedJobs: Array<{
    jobId: mongoose.Types.ObjectId;
    applicationId: mongoose.Types.ObjectId; // Reference to Application document
    jobTitle: string;
    company: string;
    location: string;
    status: 'Pending' | 'Reviewed' | 'Shortlisted' | 'Interviewed' | 'Selected' | 'Rejected';
    appliedDate: Date;
    coverLetter?: string;
    resume?: string;
    rating: number;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const JobSeekerSchema: Schema = new Schema(
  {
    // Authentication fields
    username: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: { 
      type: String, 
      required: true, 
      enum: ['job-seeker'],
      default: 'job-seeker',
    },
    
    // Email verification fields
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, trim: true, default: '' },
    emailVerificationTokenExpiry: { type: Date, default: null },
    
    // Password reset fields
    passwordResetToken: { type: String, trim: true, default: '' },
    passwordResetTokenExpiry: { type: Date, default: null },
    
    // Basic profile fields
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    title: { type: String, trim: true, default: '' },
    bio: { type: String, trim: true, default: '' },
    skills: { type: [String], default: [] },
    website: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    github: { type: String, trim: true, default: '' },
    availability: { type: String, trim: true, default: '' },
    salaryExpectation: { type: String, trim: true, default: '' },
    photo: { type: String, trim: true, default: '' }, // Photo stored as base64 string or URL
    resumeUrl: { type: String, trim: true, default: '' },
    isProfileComplete: { type: Boolean, default: false },
    
    // Applied jobs array - stores job details for quick access
    appliedJobs: {
      type: [{
        jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
        applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
        jobTitle: { type: String, required: true, trim: true },
        company: { type: String, required: true, trim: true },
        location: { type: String, required: true, trim: true },
        status: { 
          type: String, 
          enum: ['Pending', 'Reviewed', 'Shortlisted', 'Interviewed', 'Selected', 'Rejected'],
          default: 'Pending',
        },
        appliedDate: { type: Date, default: Date.now },
        coverLetter: { type: String, trim: true, default: '' },
        resume: { type: String, trim: true, default: '' },
        rating: { type: Number, default: 0, min: 0, max: 5 },
      }],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'jobseekers', // Name of the collection in MongoDB
  }
);

// Create model - Mongoose will automatically create the collection when first document is saved
const JobSeeker = mongoose.models.JobSeeker || mongoose.model<IJobSeeker>('JobSeeker', JobSeekerSchema);

export default JobSeeker;