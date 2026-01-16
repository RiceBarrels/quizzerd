import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      exam_id,
      attempt_id,
      violation_type,
      timestamp,
      details = {}
    } = body;

    // Validate required fields
    if (!exam_id) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    if (!violation_type) {
      return NextResponse.json(
        { error: 'Violation type is required' },
        { status: 400 }
      );
    }

    // Validate violation type
    const validTypes = ['console', 'visibility', 'translation', 'location', 'context_menu'];
    if (!validTypes.includes(violation_type)) {
      return NextResponse.json(
        { error: 'Invalid violation type' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Verify the exam exists
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('exam_id')
      .eq('exam_id', exam_id)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // If attempt_id is provided, verify it exists and belongs to the user
    if (attempt_id) {
      const { data: attempt, error: attemptError } = await supabase
        .from('exam_attempts')
        .select('attempt_id, student_id')
        .eq('attempt_id', attempt_id)
        .single();

      if (attemptError || !attempt) {
        return NextResponse.json(
          { error: 'Exam attempt not found' },
          { status: 404 }
        );
      }

      if (attempt.student_id !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized to log violation for this attempt' },
          { status: 403 }
        );
      }
    }

    // Log the violation
    const { data: violation, error: violationError } = await supabase
      .from('exam_violations')
      .insert({
        exam_id,
        attempt_id: attempt_id || null,
        student_id: userId,
        violation_type,
        timestamp: timestamp || new Date().toISOString(),
        acknowledged: false,
        details: details || {}
      })
      .select()
      .single();

    if (violationError) {
      console.error('Error logging violation:', violationError);
      return NextResponse.json(
        { error: 'Failed to log violation', details: violationError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: violation,
      message: 'Violation logged successfully'
    });

  } catch (error) {
    console.error('Error logging violation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve violations for an exam/attempt
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const attemptId = searchParams.get('attemptId');

    if (!examId && !attemptId) {
      return NextResponse.json(
        { error: 'Either examId or attemptId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    let query = supabase
      .from('exam_violations')
      .select('*')
      .order('timestamp', { ascending: false });

    if (attemptId) {
      query = query.eq('attempt_id', attemptId);
    } else if (examId) {
      query = query.eq('exam_id', examId);
    }

    // Students can only see their own violations
    // Teachers/admins will be filtered by RLS policies
    const { data: violations, error } = await query;

    if (error) {
      console.error('Error fetching violations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch violations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: violations,
      count: violations.length
    });

  } catch (error) {
    console.error('Error fetching violations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

