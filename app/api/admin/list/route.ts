/**
 * Admin API Route: List Course Materials (Protected)
 * 
 * GET /api/admin/list
 * 
 * This protected endpoint provides admin access to the complete course materials database.
 * Similar to the public list endpoint but with administrative privileges:
 * - Full database access without public visibility restrictions
 * - Enhanced search and filtering capabilities for content management
 * - Used by the admin dashboard for file management
 * 
 * Authentication: Bearer token (Supabase Auth) + admin role verification
 * 
 * Query Parameters:
 * - q: General search query (course codes, professor names, descriptions)
 * - course_code: Specific course code filter
 * - course_number: Specific course number filter  
 * - professor: Professor name filter
 * 
 * Response:
 * - Success: Array of course material records with full metadata
 * - Error: { error: "..." } - Authentication or database error
 */
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from '../../../../lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || undefined;
    const course_code = url.searchParams.get('course_code') || undefined;
    const course_number = url.searchParams.get('course_number') || undefined;
    const professor = url.searchParams.get('professor') || undefined;

    // Verify token and user
    const supabase = createServerSupabaseClient();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Ensure user is an admin (admins table)
    const userId = userData.user.id;
    const { data: adminRow, error: adminErr } = await supabase.from('admins').select('id').eq('user_id', userId).limit(1).maybeSingle();
    if (adminErr || !adminRow) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch pdf metadata with optional server-side search and filters
    let qb = supabase.from('pdfs').select('*').order('date', { ascending: false });
    if (course_code) qb = qb.eq('course code', course_code);
    if (course_number) qb = qb.eq('course number', course_number);
    if (professor) qb = qb.eq('professor', professor);
    if (q) {
      const safe = q.replace(/%/g, '');
      const like = `%${safe}%`;
      qb = qb.or(
        `title.ilike.${like},professor.ilike.${like},"course name".ilike.${like},"course code".ilike.${like},"course number".ilike.${like},path.ilike.${like}`
      );
    }
    const { data, error } = await qb;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
