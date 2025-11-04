import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabaseClient';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get('path');
    if (!raw) return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    const path = decodeURIComponent(raw);

    const supabase = createServerSupabaseClient();
    // Create a short-lived signed URL (60 seconds)
    const { data, error } = await supabase.storage.from('pdfs').createSignedUrl(path, 60);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Ensure downloads work well on mobile by forcing attachment disposition when navigating directly.
    const signed = new URL(data.signedUrl);
    // Append a filename to encourage Content-Disposition: attachment on Supabase Storage
    const filename = path.split('/').pop() || 'download.pdf';
    // Some Supabase deployments honor the "download" search param to force attachment
    if (!signed.searchParams.has('download')) {
      signed.searchParams.set('download', filename);
    }

    // Use a 307 redirect to preserve the GET method and ensure better mobile compatibility
    // 307 ensures that the method and body are not changed during redirect
    return NextResponse.redirect(signed.toString(), { status: 307 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
