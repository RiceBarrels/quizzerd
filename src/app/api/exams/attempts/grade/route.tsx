import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { attemptId, score, feedback } = body;

    if (!attemptId) {
      return NextResponse.json({ error: 'Attempt ID is required' }, { status: 400 });
    }

    if (score === undefined || score === null) {
      return NextResponse.json({ error: 'Score is required' }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();

    // Get the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('attempt_id', attemptId)
      .single();

    if (attemptError || !attempt) {
      console.error('Attempt lookup error:', attemptError);
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Get the exam to verify permissions
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('exam_id, creator_id, collaborator_ids, total_points')
      .eq('exam_id', attempt.exam_id)
      .single();

    if (examError || !exam) {
      console.error('Exam lookup error:', examError);
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Check if user is creator or collaborator
    const isAuthorized =
      exam.creator_id === userId ||
      exam.collaborator_ids?.includes(userId);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Not authorized to grade this attempt' }, { status: 403 });
    }

    // Calculate percentage
    const totalPoints = exam.total_points || 100;
    const percentage = (score / totalPoints) * 100;

    // Update the attempt
    const { data: updatedAttempt, error: updateError } = await supabase
      .from('exam_attempts')
      .update({
        score,
        percentage: Math.round(percentage * 100) / 100,
        feedback: feedback || null,
        status: 'graded',
        graded_at: new Date().toISOString(),
        graded_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('attempt_id', attemptId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating grade:', updateError);
      return NextResponse.json({ error: 'Failed to update grade' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attempt: updatedAttempt
    });

  } catch (error) {
    console.error('Error in grade attempt:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
