/**
 * Security Utilities for OSU PAL
 * 
 * This module provides security-related functions including:
 * - Turnstile token verification
 * - Rate limiting helpers
 * - Input validation and sanitization
 * - Request deduplication checks
 */

/**
 * Verify Cloudflare Turnstile token server-side
 * @param token - The Turnstile token from the client
 * @param remoteIP - Optional: The client's IP address for additional verification
 * @returns Promise<boolean> - True if token is valid
 */
export async function verifyTurnstileToken(token: string, remoteIP?: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error('CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured');
    return false;
  }

  try {
    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
          remoteip: remoteIP, // Optional: adds IP verification
        }),
      }
    );

    const result = await verifyResponse.json();
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

/**
 * Simple in-memory rate limiting (for development/small scale)
 * For production, consider using Redis or Vercel KV
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a request should be rate limited
 * @param identifier - Usually IP address or user identifier
 * @param limit - Number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns boolean - True if request should be allowed
 */
export function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // Clean up expired entries periodically (simple cleanup)
  if (Math.random() < 0.01) { // 1% chance to clean up
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!entry || now > entry.resetTime) {
    // First request or window has expired
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (entry.count >= limit) {
    return false; // Rate limit exceeded
  }

  // Increment count
  entry.count++;
  return true;
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(request: Request): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip'); // Cloudflare

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return 'unknown';
}

/**
 * Validate and sanitize course material request data
 */
export interface RequestValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: {
    course: string;
    email: string | null;
    details: string | null;
  };
}

export function validateRequestData(data: any): RequestValidationResult {
  const errors: string[] = [];
  
  // Course validation
  if (!data.course || typeof data.course !== 'string') {
    errors.push('Course is required and must be a string');
  } else if (data.course.length > 50) {
    errors.push('Course name must be 50 characters or less');
  } else if (data.course.trim().length === 0) {
    errors.push('Course cannot be empty');
  }

  // Email validation (optional but must be valid if provided)
  let sanitizedEmail = null;
  if (data.email && typeof data.email === 'string') {
    const emailTrim = data.email.trim();
    if (emailTrim.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrim)) {
        errors.push('Email format is invalid');
      } else if (emailTrim.length > 100) {
        errors.push('Email must be 100 characters or less');
      } else {
        sanitizedEmail = emailTrim.toLowerCase();
      }
    }
  }

  // Details validation (optional)
  let sanitizedDetails = null;
  if (data.details && typeof data.details === 'string') {
    const detailsTrim = data.details.trim();
    if (detailsTrim.length > 0) {
      if (detailsTrim.length > 500) {
        errors.push('Details must be 500 characters or less');
      } else {
        // Basic XSS prevention - strip HTML tags
        sanitizedDetails = detailsTrim.replace(/<[^>]*>/g, '');
      }
    }
  }

  const isValid = errors.length === 0;
  
  return {
    isValid,
    errors,
    sanitizedData: isValid ? {
      course: data.course.trim(),
      email: sanitizedEmail,
      details: sanitizedDetails,
    } : undefined,
  };
}