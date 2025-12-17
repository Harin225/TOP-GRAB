// lib/models/job.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  // Employer who posted the job
  employerId: mongoose.Types.ObjectId;
  
  // Job details
  title: string;
  company: string;
  location: string;
  salary: string; // e.g., "$120k - $160k"
  type: string; // Full-time, Part-time, Contract, etc.
  remote: boolean;
  description: string;
  requirements: string[]; // Array of required skills/qualifications
  deadline?: string;
  
  // Status
  status: 'Active' | 'Closed' | 'Draft';
  
  // Additional details
  category: string;
  experience: string; // Entry-level, Mid-level, Senior, etc.
  benefits: string[];
  companySize: string;
  industry: string;
  
  // Metrics
  applicants: number;
  
  // Timestamps
  postedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema(
  {
    employerId: {
      type: Schema.Types.ObjectId,
      ref: 'Employer',
      required: true,
      index: true, // Index for faster queries
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    salary: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    remote: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    requirements: {
      type: [String],
      default: [],
    },
    deadline: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Closed', 'Draft'],
      default: 'Active',
      index: true, // Index for filtering active jobs
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    experience: {
      type: String,
      trim: true,
      default: '',
    },
    benefits: {
      type: [String],
      default: [],
    },
    companySize: {
      type: String,
      trim: true,
      default: '',
    },
    industry: {
      type: String,
      trim: true,
      default: '',
    },
    applicants: {
      type: Number,
      default: 0,
    },
    postedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'jobs', // Name of the collection in MongoDB
  }
);

// Index for efficient querying
JobSchema.index({ employerId: 1, status: 1 });
JobSchema.index({ status: 1, postedDate: -1 }); // For fetching active jobs sorted by date

const Job = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);

export default Job;
