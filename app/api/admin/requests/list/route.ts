/**
 * Admin API Route: List Material Requests
 * 
 * GET /api/admin/requests/list
 * 
 * This endpoint provides administrators with access to all course material requests
 * submitted by students through the public request form. Used for:
 * - Reviewing pending material requests from students
 * - Understanding what content is most needed
 * - Managing the request queue in the admin dashboard
 * 
 * Authentication: Should verify admin access (implementation may need auth check)
 * 
 * Response:
 * - Success: { data: [...] } - Array of request records with timestamps
 * - Error: { error: "..." } - Database or server error
 * 
 * Each request includes:
 * - id: Unique request identifier
 * - course: Requested course (e.g., "CS 1113")
 * - email: Student contact email
 * - details: Additional request context
 * - created_at: Submission timestamp
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabaseClient';

export async function GET(request: Request) {
  console.log('GET /api/admin/requests/list called');
  try {
    const supabase = createServerSupabaseClient();
    console.log('Supabase server client created');

    console.log('Fetching requests from Supabase...');
    const { data, error } = await supabase
      .from('requests')
      .select('id, course, email, details, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}