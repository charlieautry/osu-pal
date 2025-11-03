/**
 * Public API Route: List Course Materials
 * 
 * GET /api/public/list
 * 
 * This endpoint provides public access to the course materials database.
 * Features:
 * - Rate limited (100 requests per 10 minutes per IP)
 * - Search and filter course materials by course code, number, professor, or text query
 * - Advanced search parsing (handles "CS 1113", "cs1113", "CS1113" formats)
 * - Term-based filtering (e.g., "Fall 2024", "Spring 2025")
 * - Returns paginated results sorted by date (newest first)
 * - No authentication required - public endpoint for student access
 * 
 * Query Parameters:
 * - q: General search query (course codes, professor names, descriptions)
 * - course_code: Specific course code filter (e.g., "CS", "MATH")
 * - course_number: Specific course number filter (e.g., "1113", "2334")
 * - professor: Professor name filter
 */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabaseClient';
import { checkRateLimit, getClientIP } from '../../../../lib/security';

export async function GET(request: Request) {
  try {
    // Rate limiting: 100 requests per 10 minutes per IP
    const clientIP = getClientIP(request);
    const rateLimitOk = checkRateLimit(clientIP, 100, 10 * 60 * 1000); // 10 minutes
    
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }
    const url = new URL(request.url);
    const course_code = url.searchParams.get('course_code') || undefined;
    const course_number = url.searchParams.get('course_number') || undefined;
    const professor = url.searchParams.get('professor') || undefined;
    const q = url.searchParams.get('q') || undefined;

    const supabase = createServerSupabaseClient();
    let qb = supabase.from('pdfs').select('*').order('date', { ascending: false });

    if (course_code) qb = qb.eq('course code', course_code);
    if (course_number) qb = qb.eq('course number', course_number);
    if (professor) qb = qb.eq('professor', professor);

    if (q) {
      // Normalize the search term and handle various formats
      const safe = q.toLowerCase().replace(/%/g, '');
      
      // Split into terms and normalize each
      const terms = safe.split(/\s+/).filter(Boolean);
      
      // Look for course code pattern (letters followed by numbers)
      const courseCodePattern = /^([a-z]+)(\d+)$/i;
      let searchParts: string[] = [];
      
      // Find any term-year combinations first
      const termPattern = /(spring|summer|fall|winter)\s*[-]?\s*(\d{4})/i;
      let termYear = '';
      const restTerms = terms.filter(term => {
        const fullTerm = term + ' ' + (terms[terms.indexOf(term) + 1] || '');
        const match = fullTerm.match(termPattern);
        if (match) {
          termYear = `${match[1]} ${match[2]}`.toLowerCase();
          return false; // Remove the term and year from further processing
        }
        return true;
      });

      // Process remaining terms for course codes and other content
      restTerms.forEach(term => {
        const stripped = term.replace(/[^a-z0-9]/gi, '');
        const match = stripped.match(courseCodePattern);
        
        if (match) {
          // If it's a course code, add specific formats
          const [, code, number] = match;
          searchParts.push(
            stripped.toLowerCase(), // e.g., "hist1103"
            `${code} ${number}`.toLowerCase() // e.g., "hist 1103"
          );
        } else {
          searchParts.push(term);
        }
      });

      // If we found a term-year combination, add it as a specific search condition
      if (termYear) {
        qb = qb.ilike('date', `%${termYear}%`);
      }

      // Create all possible combinations for flexible matching
      const searchPatterns = [...new Set(searchParts)].filter(Boolean);
      
      // Build the OR query with ilike for case-insensitive matching
      const patterns = searchPatterns.map(pattern => 
        [
          `title.ilike.%${pattern}%`,
          `professor.ilike.%${pattern}%`,
          `"course name".ilike.%${pattern}%`,
          `"course code".ilike.%${pattern}%`,
          `"course number".ilike.%${pattern}%`,
          `path.ilike.%${pattern}%`,
          // Add concatenated course code search
          pattern.match(courseCodePattern) ? 
            `concat(lower("course code"), "course number").ilike.%${pattern}%` : 
            null
        ].filter(Boolean).join(',')
      ).join(',');

      // Add the combined OR query to the query builder
      qb = qb.or(patterns);
    }

    const { data, error } = await qb;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
