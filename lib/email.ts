// lib/email.ts - Email sending utility

import nodemailer from 'nodemailer';

// Email transporter configuration
const createTransporter = () => {
  // Check if SMTP is configured
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  
  // If SMTP credentials are not set, return null (will be handled in email functions)
  if (!smtpUser || !smtpPassword) {
    return null;
  }
  
  // Use environment variables for email configuration
  // For production, use SMTP settings (Gmail, SendGrid, etc.)
  // For development, you can use Ethereal Email or similar
  
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
  } else {
    // Development: Use SMTP if configured, otherwise will log to console
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
  }
};

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  firstName: string
): Promise<void> {
  const transporter = createTransporter();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
  const verificationUrl = `${baseUrl}/verify-email/${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com',
    to: email,
    subject: 'Verify Your Email Address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Email Verification</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px;">Hello ${firstName},</p>
            <p style="font-size: 16px;">Thank you for registering! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">${verificationUrl}</p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">This link will expire in 30 minutes.</p>
            <p style="font-size: 14px; color: #6b7280;">If you didn't create an account, please ignore this email.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Hello ${firstName},
      
      Thank you for registering! Please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
      This link will expire in 30 minutes.
      
      If you didn't create an account, please ignore this email.
    `,
  };

  try {
    if (!transporter) {
      // In development without SMTP configured, just log the email
      console.log('📧 [DEV] Verification Email would be sent to:', email);
      console.log('📧 [DEV] Verification URL:', verificationUrl);
      console.log('📧 [DEV] To enable email sending, configure SMTP_USER and SMTP_PASSWORD in .env.local');
      return;
    }
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent to:', email);
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    // Don't throw error - just log it so registration can continue
    console.warn('⚠️ Email sending failed, but registration will continue');
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  firstName: string
): Promise<void> {
  const transporter = createTransporter();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password/${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com',
    to: email,
    subject: 'Reset Your Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Password Reset</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px;">Hello ${firstName},</p>
            <p style="font-size: 16px;">You requested to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #6b7280;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #9ca3af; word-break: break-all;">${resetUrl}</p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">This link will expire in 30 minutes.</p>
            <p style="font-size: 14px; color: #6b7280;">If you didn't request a password reset, please ignore this email.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Hello ${firstName},
      
      You requested to reset your password. Click the link below to create a new password:
      
      ${resetUrl}
      
      This link will expire in 30 minutes.
      
      If you didn't request a password reset, please ignore this email.
    `,
  };

  try {
    if (!transporter) {
      // In development without SMTP configured, just log the email
      console.log('📧 [DEV] Password Reset Email would be sent to:', email);
      console.log('📧 [DEV] Reset URL:', resetUrl);
      console.log('📧 [DEV] To enable email sending, configure SMTP_USER and SMTP_PASSWORD in .env.local');
      return;
    }
    
    await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent to:', email);
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    // Don't throw error - just log it so password reset request can continue
    console.warn('⚠️ Email sending failed, but password reset request will continue');
  }
}

/**
 * Send newly generated password to the user's email.
 */
export async function sendNewPasswordEmail(
  email: string,
  newPassword: string,
  firstName: string
): Promise<boolean> {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com',
    to: email,
    subject: 'Your New Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Password Reset Successful</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px;">Hello ${firstName || 'User'},</p>
            <p style="font-size: 16px;">We received a request to reset your password. You can now log in using the new password below:</p>
            <div style="background: #e0f2fe; border: 1px dashed #38bdf8; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
              <p style="font-size: 20px; font-weight: bold; letter-spacing: 1px; color: #0f172a;">${newPassword}</p>
            </div>
            <p style="font-size: 14px; color: #6b7280;">For security, we recommend changing this password after logging in.</p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">If you did not request this change, please update your password immediately once you log in.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Hello ${firstName || 'User'},

      We received a request to reset your password. You can now log in using the new password below:

      ${newPassword}

      For security, we recommend changing this password after logging in.

      If you did not request this change, please update your password immediately once you log in.
    `,
  };

  try {
    if (!transporter) {
      console.log('📧 [DEV] New Password email would be sent to:', email);
      console.log('📧 [DEV] New Password value:', newPassword);
      console.log('📧 [DEV] To enable email sending, configure SMTP_USER and SMTP_PASSWORD in .env.local');
      return true;
    }

    await transporter.sendMail(mailOptions);
    console.log('✅ New password email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending new password email:', error);
    throw error;
  }
}

