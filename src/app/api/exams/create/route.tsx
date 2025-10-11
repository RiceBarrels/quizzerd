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
      class_ids = [],
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

    // If class_ids are provided, verify user has permission to create exams for those classes
    const validClassIds = [];
    if (class_ids && Array.isArray(class_ids) && class_ids.length > 0) {
      for (const classId of class_ids) {
        if (classId && classId !== "" && classId !== "no-class") {
          const { data: classData, error: classError } = await supabase
            .from('class')
            .select('admin_ids, teacher_ids')
            .eq('class_id', classId)
            .single();

          if (classError || !classData) {
            return NextResponse.json(
              { error: `Class not found: ${classId}` },
              { status: 404 }
            );
          }

          // Check if user is admin or teacher of the class
          const hasPermission = 
            classData.admin_ids?.includes(userId) ||
            classData.teacher_ids?.includes(userId);

          if (!hasPermission) {
            return NextResponse.json(
              { error: `You must be an admin or teacher to create exams for class: ${classId}` },
              { status: 403 }
            );
          }
          
          validClassIds.push(classId);
        }
      }
    }

    // Create the exam
    const { data, error } = await supabase
      .from('exams')
      .insert({
        exam_name,
        exam_description: exam_description || null,
        class_id: validClassIds.length > 0 ? validClassIds : [],
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
        end_date: null
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