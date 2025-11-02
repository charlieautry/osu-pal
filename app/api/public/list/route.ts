import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabaseClient';

export async function GET(request: Request) {
  try {
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
      const safe = q.replace(/%/g, '');
      const like = `%${safe}%`;
      qb = qb.or(
        `title.ilike.${like},professor.ilike.${like},"course name".ilike.${like},"course code".ilike.${like},"course number".ilike.${like},path.ilike.${like}`
      );
    }

    const { data, error } = await qb;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
