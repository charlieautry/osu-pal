import { NextResponse } from "next/server";
import { createServerSupabaseClient } from '../../../../lib/supabaseClient';

// Max file size (bytes) — 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function sanitize(s: string) {
  return s.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-');
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Ensure user is an admin
    const userId = userData.user.id;
    const { data: adminRow, error: adminErr } = await supabase.from('admins').select('id').eq('user_id', userId).limit(1).maybeSingle();
    if (adminErr || !adminRow) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    // Extract and validate all required fields
    const course_code = String(formData.get('course code') || '').trim();
    const course_number = String(formData.get('course number') || '').trim();
    const professor = String(formData.get('professor') || '').trim();
    const title = String(formData.get('title') || '').trim();
    const date = String(formData.get('date') || '').trim();

    // Validate required fields
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large' }, { status: 400 });
    if (file.type !== 'application/pdf') return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    
    if (!course_code) return NextResponse.json({ error: 'Course code is required' }, { status: 400 });
    if (!course_number) return NextResponse.json({ error: 'Course number is required' }, { status: 400 });
    if (!professor) return NextResponse.json({ error: 'Professor name is required' }, { status: 400 });
    if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

    const originalName = (file as any).name || 'upload.pdf';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const path = `${sanitize(course_code)}/${sanitize(course_number)}/${sanitize(professor)}/${timestamp}-${sanitize(originalName)}`;

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // upload to storage
    const uploadRes = await supabase.storage.from('pdfs').upload(path, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });
    if (uploadRes.error) {
      return NextResponse.json({ error: uploadRes.error.message }, { status: 500 });
    }

    // Insert metadata into table
    const insertRes = await supabase.from('pdfs').insert([
      {
        path,
        'course code': course_code,
        'course number': course_number,
        professor,
        title,
        date
      },
    ]);
    if (insertRes.error) {
      // attempt to clean up uploaded file
      await supabase.storage.from('pdfs').remove([path]);
      return NextResponse.json({ error: insertRes.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, row: insertRes.data?.[0] ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
