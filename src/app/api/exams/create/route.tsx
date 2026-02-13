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
      shuffle_questions,
      show_results_immediately,
      passing_score,
      collaborator_ids = [],
      items = [],
      questions = []
    } = body;

    // Validate required fields
    if (!exam_name) {
      return NextResponse.json(
        { error: 'Exam name is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Use items from body, or questions (for backward compatibility), or empty array
    const examItems = items.length > 0 ? items : questions;

    // Process items to generate new question IDs and calculate total points
    const processedItems = examItems.map((item: any, index: number) => ({
      ...item,
      question_id: crypto.randomUUID(), // Generate new ID for copied questions
      order_index: index,
    }));

    // Calculate total points from items
    const totalPoints = processedItems.reduce((sum: number, item: any) => {
      return sum + (item.points || 0);
    }, 0);

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
        shuffle_items: shuffle_items || shuffle_questions || false,
        show_results_immediately: show_results_immediately !== false,
        passing_score: passing_score || 70,
        items: processedItems,
        total_points: totalPoints,
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
