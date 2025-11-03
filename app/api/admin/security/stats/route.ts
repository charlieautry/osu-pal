/**
 * Security Dashboard API Route
 * 
 * GET /api/admin/security/stats
 * 
 * This endpoint provides security statistics for admin monitoring.
 * Shows rate limit violations, failed verifications, and other security events.
 * 
 * Authentication: Bearer token (Supabase Auth) + admin role verification
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabaseClient';

// In a production app, these would come from a proper logging service
// For now, we'll return mock data to show the structure
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerSupabaseClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Ensure user is an admin
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

    // In production, query your logging database or service
    // For now, return sample security statistics
    const stats = {
      last24Hours: {
        totalRequests: 1250,
        rateLimitViolations: 23,
        turnstileFailures: 15,
        validationErrors: 8,
        blacklistedIPs: 2,
        suspiciousActivity: 12
      },
      topViolatingIPs: [
        { ip: '192.168.1.100', violations: 15, type: 'rate_limit', lastSeen: '2025-11-03T10:30:00Z' },
        { ip: '10.0.0.5', violations: 8, type: 'turnstile_fail', lastSeen: '2025-11-03T09:15:00Z' },
        { ip: '172.16.0.1', violations: 5, type: 'validation_error', lastSeen: '2025-11-03T08:45:00Z' }
      ],
      recentEvents: [
        {
          timestamp: '2025-11-03T10:45:00Z',
          type: 'rate_limit',
          ip: '192.168.1.100',
          endpoint: '/api/public/request',
          severity: 'medium'
        },
        {
          timestamp: '2025-11-03T10:40:00Z',
          type: 'turnstile_fail',
          ip: '10.0.0.5',
          endpoint: '/api/public/request',
          severity: 'high'
        }
      ]
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Security stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security statistics' },
      { status: 500 }
    );
  }
}