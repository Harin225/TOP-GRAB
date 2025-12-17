// lib/token-utils.ts - Token generation utilities

import crypto from 'crypto';

/**
 * Generate a secure random token using crypto.randomBytes
 * @param length - Length of the token in bytes (default: 32)
 * @returns Hex-encoded token string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a temporary password consisting of letters and digits.
 * @param length - Number of characters (default: 10)
 * @returns Random alphanumeric password
 */
export function generateTemporaryPassword(length: number = 10): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    // Use bytes to index into charset
    const index = bytes[i] % charset.length;
    password += charset[index];
  }
  return password;
}

/**
 * Generate token expiry time (default: 30 minutes from now)
 * @param minutes - Number of minutes until expiry (default: 30)
 * @returns Date object representing the expiry time
 */
export function generateTokenExpiry(minutes: number = 30): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry;
}

/**
 * Check if a token has expired
 * @param expiryDate - The expiry date to check
 * @returns true if token is expired, false otherwise
 */
export function isTokenExpired(expiryDate: Date | null | undefined): boolean {
  if (!expiryDate) {
    return true; // No expiry date means expired
  }
  return new Date() > new Date(expiryDate);
}

