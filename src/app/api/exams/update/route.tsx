import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function PUT(request: Request) {
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
      exam_name,
      exam_description,
      subjects = [],
      is_public,
      is_published,
      duration_minutes,
      attempts_allowed,
      shuffle_items,
      show_results_immediately,
      passing_score,
      collaborator_ids = [],
      items = [],
      total_points,
      status,
      start_date,
      end_date,
      // Cheating detection settings
      console_detection,
      translation_detection,
      allow_word_by_word_translation,
      allow_word_by_word_definition,
      visibility_change_detection,
      location_detection,
      location
    } = body;

    // Validate required fields
    if (!exam_id) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    if (!exam_name) {
      return NextResponse.json(
        { error: 'Exam name is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // First, check if the exam exists and user has permission to edit
    const { data: existingExam, error: fetchError } = await supabase
      .from('exams')
      .select('creator_id, collaborator_ids')
      .eq('exam_id', exam_id)
      .single();

    if (fetchError || !existingExam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to edit (must be creator or collaborator)
    const canEdit =
      existingExam.creator_id === userId ||
      (existingExam.collaborator_ids && existingExam.collaborator_ids.includes(userId));

    if (!canEdit) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this exam' },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData = {
      exam_name,
      exam_description: exam_description || null,
      subject: subjects || [],
      is_public: is_public || false,
      is_published: is_published || false,
      collaborator_ids: collaborator_ids || [],
      duration_minutes: duration_minutes || 60,
      attempts_allowed: attempts_allowed || 1,
      shuffle_items: shuffle_items || false,
      show_results_immediately: show_results_immediately !== false,
      passing_score: passing_score || 70,
      items: items || [],
      total_points: total_points || 0,
      status: status || 'draft',
      start_date: start_date || null,
      end_date: end_date || null,
      // Cheating detection settings
      console_detection: console_detection || false,
      translation_detection: translation_detection || false,
      allow_word_by_word_translation: allow_word_by_word_translation || false,
      allow_word_by_word_definition: allow_word_by_word_definition || false,
      visibility_change_detection: visibility_change_detection || false,
      location_detection: location_detection || false,
      location: location || { coordinates: '', rangeInMeters: '' },
      updated_at: new Date().toISOString()
    };

    // Update the exam
    const { data, error } = await supabase
      .from('exams')
      .update(updateData)
      .eq('exam_id', exam_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating exam:', error);
      return NextResponse.json(
        { error: 'Failed to update exam', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: is_published ? 'Exam published successfully' : 'Exam updated successfully'
    });

  } catch (error) {
    console.error('Error updating exam:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE endpoint for deleting an exam
export async function DELETE(request: Request) {
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

    // Check if exam exists and user has permission
    const { data: existingExam, error: fetchError } = await supabase
      .from('exams')
      .select('creator_id, collaborator_ids')
      .eq('exam_id', examId)
      .single();

    if (fetchError || !existingExam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to delete (must be creator or collaborator)
    const canDelete =
      existingExam.creator_id === userId ||
      (existingExam.collaborator_ids && existingExam.collaborator_ids.includes(userId));

    if (!canDelete) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this exam' },
        { status: 403 }
      );
    }

    // Delete the exam
    const { error: deleteError } = await supabase
      .from('exams')
      .delete()
      .eq('exam_id', examId);

    if (deleteError) {
      console.error('Error deleting exam:', deleteError);
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