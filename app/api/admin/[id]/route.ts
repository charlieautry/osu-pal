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

    const id = params.id;
    // Find the row to get the path
    const { data: rows, error: selectErr } = await supabase.from('pdfs').select('path').eq('id', id).limit(1).single();
    if (selectErr || !rows) {
      return NextResponse.json({ error: selectErr?.message ?? 'Not found' }, { status: 404 });
    }

    const path = (rows as any).path;
    if (!path) return NextResponse.json({ error: 'No path for this record' }, { status: 400 });

    // Delete storage object
    const rm = await supabase.storage.from('pdfs').remove([path]);
    if (rm.error) {
      return NextResponse.json({ error: rm.error.message }, { status: 500 });
    }

    // Delete DB row
    const del = await supabase.from('pdfs').delete().eq('id', id);
    if (del.error) {
      return NextResponse.json({ error: del.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
