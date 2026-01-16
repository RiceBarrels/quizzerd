import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// GET - Fetch a specific version's full data
export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string; versionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { examId, versionId } = await params;
    const supabase = await createSupabaseClient();

    // Verify exam ownership
    const { data: exam } = await supabase
      .from('exams')
      .select('created_by')
      .eq('exam_id', examId)
      .single();

    if (!exam || exam.created_by !== userId) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Fetch version
    const { data: version, error } = await supabase
      .from('exam_versions')
      .select('*')
      .eq('version_id', versionId)
      .eq('exam_id', examId)
      .single();

    if (error || !version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: version,
    });
  } catch (error) {
    console.error('Error in GET /api/exams/[examId]/versions/[versionId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Restore exam to this version
export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string; versionId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { examId, versionId } = await params;
    const supabase = await createSupabaseClient();

    // Fetch current exam to verify ownership
    const { data: currentExam } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', examId)
      .single();

    if (!currentExam || currentExam.created_by !== userId) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Fetch the version to restore
    const { data: version, error: versionError } = await supabase
      .from('exam_versions')
      .select('*')
      .eq('version_id', versionId)
      .eq('exam_id', examId)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // First, save current state as a new version before restoring
    const { data: latestVersion } = await supabase
      .from('exam_versions')
      .select('version_number')
      .eq('exam_id', examId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const newVersionNumber = (latestVersion?.version_number || 0) + 1;

    // Save current state
    await supabase.from('exam_versions').insert({
      exam_id: examId,
      version_number: newVersionNumber,
      exam_name: currentExam.exam_name,
      exam_description: currentExam.exam_description,
      items: currentExam.items,
      total_points: currentExam.total_points,
      settings: {
        duration_minutes: currentExam.duration_minutes,
        attempts_allowed: currentExam.attempts_allowed,
        passing_score: currentExam.passing_score,
        shuffle_items: currentExam.shuffle_items,
        show_results_immediately: currentExam.show_results_immediately,
        is_practice_mode: currentExam.is_practice_mode,
        show_explanations: currentExam.show_explanations,
        allow_retry_questions: currentExam.allow_retry_questions,
      },
      change_summary: `Auto-saved before restoring to version ${version.version_number}`,
      changed_by: userId,
    });

    // Restore exam to the selected version
    const settings = version.settings || {};
    const { error: updateError } = await supabase
      .from('exams')
      .update({
        exam_name: version.exam_name,
        exam_description: version.exam_description,
        items: version.items,
        total_points: version.total_points,
        duration_minutes: settings.duration_minutes,
        attempts_allowed: settings.attempts_allowed,
        passing_score: settings.passing_score,
        shuffle_items: settings.shuffle_items,
        show_results_immediately: settings.show_results_immediately,
        is_practice_mode: settings.is_practice_mode,
        show_explanations: settings.show_explanations,
        allow_retry_questions: settings.allow_retry_questions,
        updated_at: new Date().toISOString(),
      })
      .eq('exam_id', examId);

    if (updateError) {
      console.error('Error restoring exam:', updateError);
      return NextResponse.json({ error: 'Failed to restore exam' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Restored to version ${version.version_number}`,
    });
  } catch (error) {
    console.error('Error in POST /api/exams/[examId]/versions/[versionId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
