// lib/auth.ts (Complete Authentication Helper)

// import * as bcrypt from 'bcryptjs';
// import * as jwt from 'jsonwebtoken';
// Changed from 'import * as bcrypt from "bcryptjs"'
const bcrypt = require('bcryptjs');
// Changed from 'import * as jwt from "jsonwebtoken"'
const jwt = require('jsonwebtoken');
// --------------------------------------------------
// 1. CONFIGURATION
// --------------------------------------------------

// The cost factor for password hashing. 10 is the standard recommendation.
const SALT_ROUNDS = 10; 

// The secret key used to sign and verify JWTs. Loaded from .env.local.
// IMPORTANT: Always read from process.env directly to ensure consistency across Edge and Node runtimes
const TOKEN_EXPIRY = '7d'; // Token expires in 7 days

// Helper function to get JWT_SECRET consistently
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_JWT_SECRET || 'fallback-secret-key-for-development-123456789';
  if (!process.env.JWT_SECRET && !process.env.NEXT_PUBLIC_JWT_SECRET) {
    console.warn('[lib/auth] WARNING: JWT_SECRET not found in environment variables. Using fallback secret.');
  }
  return secret;
}

// --------------------------------------------------
// 2. PASSWORD HASHING & VERIFICATION
// --------------------------------------------------

/**
 * Hashes a plaintext password using bcrypt.
 * @param password The plaintext password string.
 * @returns The hashed password string.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

/**
 * Compares a plaintext password with a stored hashed password.
 * @param plaintextPassword The password provided by the user during login.
 * @param hash The stored hashed password.
 * @returns True if the passwords match, false otherwise.
 */
export async function verifyPassword(plaintextPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintextPassword, hash);
}

// --------------------------------------------------
// 3. JWT (JSON WEB TOKEN) FUNCTIONS
// --------------------------------------------------

/**
 * Creates a JWT for a newly logged-in user.
 * @param payload The user information to encode (e.g., userId, role, username).
 * @returns The signed JWT string.
 */
export function createToken(payload: object): string {
  // Signs the payload using the secret key and sets an expiration time
  const secret = getJWTSecret();
  console.log('[createToken] Creating token with secret length:', secret.length);
  return jwt.sign(payload, secret, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Verifies a JWT and extracts the payload.
 * @param token The JWT string (usually from a cookie or header).
 * @returns The decoded payload (user info) or null if the token is invalid or expired.
 */
export function verifyToken(token: string): any | null {
  try {
    const secret = getJWTSecret();
    console.log('[verifyToken] Verifying token with secret length:', secret.length);
    const decoded = jwt.verify(token, secret);
    console.log('[verifyToken] Token verified successfully:', { userId: decoded.userId, role: decoded.role, username: decoded.username });
    return decoded;
  } catch (error: any) {
    // Token verification failed - log the error for debugging
    const errorMessage = error?.message || String(error);
    console.error('[verifyToken] Token verification failed:', errorMessage);
    console.error('[verifyToken] Error type:', error?.name);
    
    // Specific error handling
    if (errorMessage.includes('invalid signature') || error?.name === 'JsonWebTokenError') {
      console.error('[verifyToken] ERROR: Token signature is invalid. This usually means:');
      console.error('[verifyToken]   1. Token was created with a different JWT_SECRET');
      console.error('[verifyToken]   2. JWT_SECRET changed between login and verification');
      console.error('[verifyToken] SOLUTION: Clear browser cookies and log in again.');
    } else if (errorMessage.includes('expired') || error?.name === 'TokenExpiredError') {
      console.error('[verifyToken] ERROR: Token has expired.');
    } else if (errorMessage.includes('malformed')) {
      console.error('[verifyToken] ERROR: Token is malformed.');
    }
    
    return null; 
  }
}