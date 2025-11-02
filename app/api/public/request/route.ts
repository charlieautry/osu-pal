import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabaseClient';

export async function POST(request: Request) {
  console.log('Received request to /api/public/request');
  
  try {
    const supabase = createServerSupabaseClient();
    console.log('Supabase client initialized');

    console.log('Parsing request body...');
    const body = await request.json();
    console.log('Received body:', body);
    
    const { course, email, details } = body;

    if (!course) {
      return NextResponse.json(
        { error: 'Course is required' },
        { status: 400 }
      );
    }

    console.log('Attempting to insert into requests table:', {
      course,
      email: email || null,
      details: details || null
    });

    const { data, error } = await supabase
      .from('requests')
      .insert([
        { 
          course,
          email: email || null,
          details: details || null
        }
      ])
      .select();
    
    console.log('Supabase response:', { data, error });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Request error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit request' },
      { status: 500 }
    );
  }
}