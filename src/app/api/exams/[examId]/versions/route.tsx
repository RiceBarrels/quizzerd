import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// GET - Fetch version history for an exam
export async function GET(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { examId } = await params;
    const supabase = await createSupabaseClient();

    // Verify exam access (owner or collaborator)
    const { data: exam } = await supabase
      .from('exams')
      .select('creator_id, collaborator_ids')
      .eq('exam_id', examId)
      .single();

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    const hasAccess = exam.creator_id === userId || exam.collaborator_ids?.includes(userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch versions
    const { data: versions, error } = await supabase
      .from('exam_versions')
      .select('version_id, version_number, change_summary, changed_by, created_at, exam_name, total_points')
      .eq('exam_id', examId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error fetching versions:', error);
      return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: versions || [],
    });
  } catch (error) {
    console.error('Error in GET /api/exams/[examId]/versions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new version snapshot
export async function POST(
  request: Request,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { examId } = await params;
    const body = await request.json();
    const { change_summary } = body;

    const supabase = await createSupabaseClient();

    // Fetch current exam data
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', examId)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Check if user is owner or collaborator
    const hasAccess = exam.creator_id === userId || exam.collaborator_ids?.includes(userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get latest version number
    const { data: latestVersion } = await supabase
      .from('exam_versions')
      .select('version_number')
      .eq('exam_id', examId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const newVersionNumber = (latestVersion?.version_number || 0) + 1;

    // Create version snapshot
    const settings = {
      duration_minutes: exam.duration_minutes,
      attempts_allowed: exam.attempts_allowed,
      passing_score: exam.passing_score,
      shuffle_items: exam.shuffle_items,
      show_results_immediately: exam.show_results_immediately,
      is_practice_mode: exam.is_practice_mode,
      show_explanations: exam.show_explanations,
      allow_retry_questions: exam.allow_retry_questions,
    };

    const { data: version, error: versionError } = await supabase
      .from('exam_versions')
      .insert({
        exam_id: examId,
        version_number: newVersionNumber,
        exam_name: exam.exam_name,
        exam_description: exam.exam_description,
        items: exam.items,
        total_points: exam.total_points,
        settings,
        change_summary: change_summary || `Version ${newVersionNumber}`,
        changed_by: userId,
      })
      .select()
      .single();

    if (versionError) {
      console.error('Error creating version:', versionError);
      return NextResponse.json({ error: 'Failed to create version' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: version,
    });
  } catch (error) {
    console.error('Error in POST /api/exams/[examId]/versions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
