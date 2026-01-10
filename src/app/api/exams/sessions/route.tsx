import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'all';
    const offset = (page - 1) * limit;

    const supabase = await createSupabaseClient();

    // Build query for sessions created by the user
    let query = supabase
      .from('exam_sessions')
      .select(`
        *,
        exams:exam_id (
          exam_id,
          exam_name,
          exam_description,
          items,
          total_points
        )
      `, { count: 'exact' })
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    // Filter by status if specified
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: sessions, error, count } = await query;

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    // Get attempt counts for each session
    const sessionIds = sessions?.map(s => s.session_id) || [];

    let attemptCounts: Record<string, number> = {};
    if (sessionIds.length > 0) {
      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('session_id')
        .in('session_id', sessionIds);

      if (attempts) {
        attemptCounts = attempts.reduce((acc: Record<string, number>, attempt) => {
          if (attempt.session_id) {
            acc[attempt.session_id] = (acc[attempt.session_id] || 0) + 1;
          }
          return acc;
        }, {});
      }
    }

    // Add attempt count to each session
    const sessionsWithCounts = sessions?.map(session => ({
      ...session,
      attempt_count: attemptCounts[session.session_id] || 0
    }));

    return NextResponse.json({
      success: true,
      data: sessionsWithCounts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Error in sessions API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
