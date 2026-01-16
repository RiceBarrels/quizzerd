import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

// POST - Update student progress during exam
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { attempt_id, current_question, answered_count, total_questions } = body;

    if (!attempt_id) {
      return NextResponse.json(
        { error: 'Attempt ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    const progress = {
      answered: answered_count || 0,
      total: total_questions || 0,
      lastActivity: new Date().toISOString()
    };

    const { error } = await supabase
      .from('exam_attempts')
      .update({
        current_question: current_question || 0,
        progress
      })
      .eq('attempt_id', attempt_id);

    if (error) {
      console.error('Error updating progress:', error);
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get progress for a session (teacher view)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    const { data: attempts, error } = await supabase
      .from('exam_attempts')
      .select(`
        attempt_id,
        student_name,
        student_email,
        status,
        score,
        started_at,
        submitted_at,
        current_question,
        progress,
        violations
      `)
      .eq('session_id', sessionId)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching progress:', error);
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      total: attempts?.length || 0,
      inProgress: attempts?.filter(a => a.status === 'in_progress').length || 0,
      completed: attempts?.filter(a => a.status === 'completed').length || 0,
      notStarted: 0, // Would need allowed_emails count from session
      withViolations: attempts?.filter(a => (a.violations || []).length > 0).length || 0
    };

    return NextResponse.json({
      success: true,
      data: attempts,
      stats
    });

  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
