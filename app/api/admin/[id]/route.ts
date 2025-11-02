import { NextResponse } from "next/server";
import { createServerSupabaseClient } from '../../../../lib/supabaseClient';

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

    const rawId = params.id;
    const identifier = decodeURIComponent(rawId);

    // Try to find by path first (some rows may use path as the primary key)
    let path: string | null = null;
    let foundBy: 'path' | 'id' | null = null;

    const { data: byPath, error: pathErr } = await supabase.from('pdfs').select('path').eq('path', identifier).limit(1).maybeSingle();
    if (!pathErr && byPath && (byPath as any).path) {
      path = (byPath as any).path;
      foundBy = 'path';
    } else {
      // Fallback: try lookup by id
      const { data: byId, error: idErr } = await supabase.from('pdfs').select('path').eq('id', identifier).limit(1).maybeSingle();
      if (!idErr && byId && (byId as any).path) {
        path = (byId as any).path;
        foundBy = 'id';
      }
    }

    if (!path || !foundBy) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Delete storage object
    const rm = await supabase.storage.from('pdfs').remove([path]);
    if (rm.error) {
      return NextResponse.json({ error: rm.error.message }, { status: 500 });
    }

    // Delete DB row by the same key we looked it up with
    let del;
    if (foundBy === 'path') {
      del = await supabase.from('pdfs').delete().eq('path', path);
    } else {
      del = await supabase.from('pdfs').delete().eq('id', identifier);
    }
    if (del.error) {
      return NextResponse.json({ error: del.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
