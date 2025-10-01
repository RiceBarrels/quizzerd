import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(request) {
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

    if (!examId) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // First, check if the user has permission to delete this exam
    const { data: examData, error: fetchError } = await supabase
      .from('exams')
      .select('creator_id')
      .eq('exam_id', examId)
      .single();

    if (fetchError || !examData) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Only the creator can delete the exam
    if (examData.creator_id !== userId) {
      return NextResponse.json(
        { error: 'Only the exam creator can delete this exam' },
        { status: 403 }
      );
    }

    // Delete the exam (cascades to exam_attempts)
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('exam_id', examId);

    if (error) {
      console.error('Error deleting exam:', error);
      return NextResponse.json(
        { error: 'Failed to delete exam' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Exam deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting exam:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}