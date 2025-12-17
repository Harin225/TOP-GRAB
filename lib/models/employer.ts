// lib/models/employer.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployer extends Document {
  // Authentication fields
  username: string;
  passwordHash: string;
  role: 'employer';
  
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
  
  // Company Information
  name: string;
  industry: string;
  size: string;
  founded: string;
  location: string;
  website: string;
  linkedin: string;
  email: string;
  phone: string;
  description: string;
  mission: string;
  specialties: string[];
  photo?: string; // Photo stored as base64 string or URL
  isProfileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EmployerSchema: Schema = new Schema(
  {
    // Authentication fields
    username: { 
      type: String, 
      required: true, 
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true },
    role: { 
      type: String, 
      required: true, 
      enum: ['employer'],
      default: 'employer',
    },
    
    // Email verification fields
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, trim: true, default: '' },
    emailVerificationTokenExpiry: { type: Date, default: null },
    
    // Password reset fields
    passwordResetToken: { type: String, trim: true, default: '' },
    passwordResetTokenExpiry: { type: Date, default: null },
    
    // Basic profile fields
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    
    // Company Information
    name: { type: String, trim: true, default: '' },
    industry: { type: String, trim: true, default: '' },
    size: { type: String, trim: true, default: '' },
    founded: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    mission: { type: String, trim: true, default: '' },
    specialties: [{ type: String, trim: true }],
    photo: { type: String, trim: true, default: '' }, // Photo stored as base64 string or URL
    isProfileComplete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'employers' // Name of the collection in MongoDB
  }
);

const Employer = mongoose.models.Employer || mongoose.model<IEmployer>('Employer', EmployerSchema);

export default Employer;
