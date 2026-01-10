import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
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
      exam_name,
      exam_description,
      subjects = [],
      is_public,
      duration_minutes,
      attempts_allowed,
      shuffle_items,
      show_results_immediately,
      passing_score,
      collaborator_ids = []
    } = body;

    // Validate required fields
    if (!exam_name) {
      return NextResponse.json(
        { error: 'Exam name is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Create the exam
    const { data, error } = await supabase
      .from('exams')
      .insert({
        exam_name,
        exam_description: exam_description || null,
        subject: subjects || [],
        creator_id: userId,
        is_public: is_public || false,
        collaborator_ids: collaborator_ids,
        duration_minutes: duration_minutes || 60,
        attempts_allowed: attempts_allowed || 1,
        shuffle_items: shuffle_items || false,
        show_results_immediately: show_results_immediately !== false,
        passing_score: passing_score || 70,
        items: [],
        total_points: 0,
        status: 'draft',
        is_published: false,
        start_date: null,
        end_date: null,
        allowed_emails: []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating exam:', error);
      return NextResponse.json(
        { error: 'Failed to create exam' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error creating exam:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
