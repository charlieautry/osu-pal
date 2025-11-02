import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabaseClient';

export async function GET(request: Request) {
  try {
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
