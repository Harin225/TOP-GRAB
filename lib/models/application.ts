// lib/models/application.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IApplication extends Document {
  // Job and applicant references
  jobId: mongoose.Types.ObjectId;
  jobSeekerId: mongoose.Types.ObjectId;
  
  // Applicant details (denormalized for quick access)
  applicantName: string;
  applicantEmail: string;
  
  // Application details
  status: 'Pending' | 'Reviewed' | 'Shortlisted' | 'Interviewed' | 'Selected' | 'Rejected';
  resume?: string; // URL or base64 string
  coverLetter?: string;
  rating: number; // Employer's rating of the applicant (0-5)
  
  // Timestamps
  appliedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema: Schema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
    },
    jobSeekerId: {
      type: Schema.Types.ObjectId,
      ref: 'JobSeeker',
      required: true,
      index: true,
    },
    applicantName: {
      type: String,
      required: true,
      trim: true,
    },
    applicantEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Reviewed', 'Shortlisted', 'Interviewed', 'Selected', 'Rejected'],
      default: 'Pending',
      index: true,
    },
    resume: {
      type: String,
      trim: true,
    },
    coverLetter: {
      type: String,
      trim: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'applications',
  }
);

// Index for efficient querying
ApplicationSchema.index({ jobId: 1, status: 1 });
ApplicationSchema.index({ jobSeekerId: 1 });
ApplicationSchema.index({ jobId: 1, jobSeekerId: 1 }, { unique: true }); // Prevent duplicate applications

const Application = mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);

export default Application;
