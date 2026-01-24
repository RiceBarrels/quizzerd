import { NextResponse } from 'next/server';
import { createSupabaseClient, createSupabaseAdminClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseClient();
    const adminSupabase = createSupabaseAdminClient();

    // If examId provided, debug collaborator access
    if (examId) {
      // Get exam with admin to see actual data
      const { data: examData } = await adminSupabase
        .from('exams')
        .select('exam_id, creator_id, collaborator_ids')
        .eq('exam_id', examId)
        .single();

      // Try to get exam with user's token (tests RLS)
      const { data: userExamData, error: userExamError } = await supabase
        .from('exams')
        .select('exam_id, creator_id, collaborator_ids')
        .eq('exam_id', examId)
        .single();

      return NextResponse.json({
        debug: true,
        userId,
        examData,
        isCreator: examData?.creator_id === userId,
        isCollaborator: examData?.collaborator_ids?.includes(userId),
        collaboratorIds: examData?.collaborator_ids,
        canAccessWithRLS: !!userExamData,
        rlsError: userExamError?.message
      });
    }

    // Test if exams table exists
    const { data, error } = await supabase
      .from('exams')
      .select('exam_id')
      .limit(1);

    if (error) {
      return NextResponse.json({
        error: 'Database error',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Exams table exists and is accessible',
      userId,
      sampleData: data
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}