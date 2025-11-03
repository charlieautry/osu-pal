/**
 * Public API Route: Submit Course Material Requests
 * 
 * POST /api/public/request
 * 
 * This endpoint allows students to request specific course materials that aren't currently
 * available in the database. Features:
 * - Server-side Turnstile verification (REQUIRED - prevents bot abuse)
 * - Rate limiting by IP address (max 5 requests per hour)
 * - Input validation and sanitization
 * - Duplicate request detection
 * - Stores validated requests in Supabase for admin review
 * 
 * Request Body:
 * - course: Course identifier (e.g., "CS 1113", "MATH 2144") [required, max 50 chars]
 * - email: Student's contact email for follow-up [optional, must be valid format]
 * - details: Additional context about requested materials [optional, max 500 chars]
 * - turnstileToken: Cloudflare Turnstile verification token [required]
 * 
 * Response:
 * - Success: { success: true, message: "..." } - Confirmation of request submission
 * - Error: { error: "..." } - Security, validation, or server error details
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabaseClient';
import { verifyTurnstileToken, checkRateLimit, getClientIP, validateRequestData } from '../../../../lib/security';
import { performSecurityChecks, addSecurityHeaders, logSecurityEvent } from '../../../../lib/securityMiddleware';

export async function POST(request: Request) {
  const response = NextResponse.next();
  
  try {
    // Get client IP for rate limiting and security
    const clientIP = getClientIP(request);
    console.log('Received request to /api/public/request from IP:', clientIP);
    
    // Perform comprehensive security checks
    const securityCheck = performSecurityChecks(request, clientIP, '/api/public/request');
    if (!securityCheck.allowed) {
      const errorResponse = NextResponse.json(
        { error: securityCheck.reason || 'Request blocked for security reasons' },
        { status: 403 }
      );
      addSecurityHeaders(errorResponse.headers);
      return errorResponse;
    }

    // Rate limiting: 5 requests per hour per IP
    const rateLimitOk = checkRateLimit(clientIP, 5, 60 * 60 * 1000); // 1 hour window
    if (!rateLimitOk) {
      logSecurityEvent({
        type: 'rate_limit',
        ip: clientIP,
        endpoint: '/api/public/request',
        details: 'Rate limit exceeded for request submission'
      });
      
      const errorResponse = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
      addSecurityHeaders(errorResponse.headers);
      return errorResponse;
    }

    const body = await request.json();
    console.log('Parsing request body...');
    
    const { course, email, details, turnstileToken } = body;

    // CRITICAL SECURITY: Verify Turnstile token server-side
    if (!turnstileToken) {
      logSecurityEvent({
        type: 'turnstile_fail',
        ip: clientIP,
        endpoint: '/api/public/request',
        details: 'Missing Turnstile token'
      });
      
      const errorResponse = NextResponse.json(
        { error: 'Security verification required' },
        { status: 400 }
      );
      addSecurityHeaders(errorResponse.headers);
      return errorResponse;
    }

    const turnstileValid = await verifyTurnstileToken(turnstileToken, clientIP);
    if (!turnstileValid) {
      logSecurityEvent({
        type: 'turnstile_fail',
        ip: clientIP,
        endpoint: '/api/public/request',
        details: 'Invalid Turnstile token'
      });
      
      const errorResponse = NextResponse.json(
        { error: 'Security verification failed. Please try again.' },
        { status: 403 }
      );
      addSecurityHeaders(errorResponse.headers);
      return errorResponse;
    }
    console.log('Turnstile verification passed');

    // Validate and sanitize input data
    const validation = validateRequestData({ course, email, details });
    if (!validation.isValid) {
      logSecurityEvent({
        type: 'validation_error',
        ip: clientIP,
        endpoint: '/api/public/request',
        details: { errors: validation.errors, input: { course, email: !!email, details: !!details } }
      });
      
      const errorResponse = NextResponse.json(
        { error: `Validation error: ${validation.errors.join(', ')}` },
        { status: 400 }
      );
      addSecurityHeaders(errorResponse.headers);
      return errorResponse;
    }

    const sanitizedData = validation.sanitizedData!;
    console.log('Data validation passed');

    const supabase = createServerSupabaseClient();

    // Check for duplicate requests (same email + course within last 24 hours)
    if (sanitizedData.email) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: existingRequests, error: duplicateCheckError } = await supabase
        .from('requests')
        .select('id')
        .eq('course', sanitizedData.course)
        .eq('email', sanitizedData.email)
        .gte('created_at', twentyFourHoursAgo)
        .limit(1);

      if (duplicateCheckError) {
        console.error('Error checking for duplicates:', duplicateCheckError);
        // Continue processing - don't fail on duplicate check error
      } else if (existingRequests && existingRequests.length > 0) {
        console.log('Duplicate request detected:', sanitizedData.email, sanitizedData.course);
        return NextResponse.json(
          { error: 'You have already submitted a request for this course within the last 24 hours.' },
          { status: 409 }
        );
      }
    }

    console.log('Attempting to insert into requests table:', sanitizedData);

    const { data, error } = await supabase
      .from('requests')
      .insert([sanitizedData])
      .select();
    
    console.log('Supabase response:', { data, error });

    if (error) {
      throw error;
    }

    console.log('Request successfully submitted:', sanitizedData.course);
    
    const successResponse = NextResponse.json({ 
      success: true, 
      message: 'Your request has been submitted successfully. We will review it and add the materials if available.',
      data 
    });
    
    addSecurityHeaders(successResponse.headers);
    return successResponse;

  } catch (error) {
    console.error('Request submission error:', error);
    
    const errorResponse = NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit request' },
      { status: 500 }
    );
    
    addSecurityHeaders(errorResponse.headers);
    return errorResponse;
  }
}