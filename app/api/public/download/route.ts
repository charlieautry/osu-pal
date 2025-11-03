/**
 * Public API Route: Generate Download URLs for Course Materials
 * 
 * GET /api/public/download?path=...
 * 
 * This endpoint generates secure, time-limited download URLs for PDF files stored in Supabase Storage.
 * Features:
 * - Rate limited (30 downloads per 5 minutes per IP)
 * - Creates signed URLs valid for 60 seconds (security measure)
 * - No authentication required for public materials
 * - Handles URL encoding/decoding of file paths
 * - Returns direct download links that bypass browser CORS restrictions
 * 
 * Query Parameters:
 * - path: The storage path of the file to download (URL encoded)
 * 
 * Response:
 * - Success: { url: "https://..." } - Temporary signed download URL
 * - Error: { error: "..." } - Error message with appropriate HTTP status
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabaseClient';
import { checkRateLimit, getClientIP } from '../../../../lib/security';

export async function GET(request: Request) {
  try {
    // Rate limiting: 30 downloads per 5 minutes per IP
    const clientIP = getClientIP(request);
    const rateLimitOk = checkRateLimit(clientIP, 30, 5 * 60 * 1000); // 5 minutes
    
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Download rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    const url = new URL(request.url);
    const raw = url.searchParams.get('path');
    if (!raw) return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    const path = decodeURIComponent(raw);

    const supabase = createServerSupabaseClient();
    // create a short-lived signed URL (60 seconds)
    const { data, error } = await supabase.storage.from('pdfs').createSignedUrl(path, 60);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ url: data.signedUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
