/**
 * Cloudflare Turnstile Verification API Route
 * 
 * POST /api/verify-turnstile
 * 
 * This endpoint verifies Cloudflare Turnstile CAPTCHA tokens to prevent bot abuse.
 * Used by the material request form to ensure requests come from real users.
 * Features:
 * - Rate limited (10 verifications per minute per IP)
 * - Validates Turnstile tokens against Cloudflare's verification API
 * - Uses server-side secret key (never exposed to client)
 * - Returns verification status for client-side handling
 * 
 * Request Body:
 * - token: Turnstile token from client-side widget
 * 
 * Response:
 * - Success: { success: true } - Token is valid
 * - Error: { success: false, error: "..." } - Invalid token or server error
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP } from '../../../lib/security';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 verifications per minute per IP
    const clientIP = getClientIP(request);
    const rateLimitOk = checkRateLimit(clientIP, 10, 60 * 1000); // 1 minute
    
    if (!rateLimitOk) {
      return NextResponse.json(
        { success: false, error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      );
    }
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

    if (!secretKey) {
      console.error('CLOUDFLARE_TURNSTILE_SECRET_KEY is not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify the token with Cloudflare
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
        }),
      }
    );

    const verifyData = await verifyResponse.json();

    if (verifyData.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: 'Verification failed', details: verifyData },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
