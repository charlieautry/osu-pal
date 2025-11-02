import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabaseClient';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Require Authorization header with a valid access token
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerSupabaseClient();

    // Verify token and ensure user is an admin
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userData.user.id;
    const { data: adminRow, error: adminErr } = await supabase
      .from('admins')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (adminErr || !adminRow) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rawId = params.id;
    const id = decodeURIComponent(rawId);

    // Delete by id (new primary key column)
    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting request:', error);
    return NextResponse.json(
      { error: 'Failed to delete request' },
      { status: 500 }
    );
  }
}