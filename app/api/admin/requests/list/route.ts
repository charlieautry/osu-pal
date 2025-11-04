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