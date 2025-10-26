import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

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

    if (!examId) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    
    // Get all assignments for this exam
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('class_assignments')
      .select('assignment, exam_id')
      .eq('exam_id', examId);

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch assignments', details: assignmentsError.message },
        { status: 500 }
      );
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        success: true,
        classIds: [],
        count: 0
      });
    }

    // Get the assignment IDs
    const assignmentIds = assignments.map(a => a.assignment);

    // Find which classes have these assignment IDs in their assignments array
    const { data: classes, error: classesError } = await supabaseAdmin
      .from('class')
      .select('class_id, assignments');

    if (classesError) {
      console.error('Error fetching classes:', classesError);
      return NextResponse.json(
        { error: 'Failed to fetch classes', details: classesError.message },
        { status: 500 }
      );
    }

    // Filter classes that have any of these assignment IDs
    const classIds = classes
      ?.filter(cls => {
        const classAssignments = cls.assignments || [];
        return assignmentIds.some(assignId => classAssignments.includes(assignId));
      })
      .map(cls => cls.class_id) || [];

    return NextResponse.json({
      success: true,
      classIds,
      count: classIds.length
    });

  } catch (error) {
    console.error('Error checking existing assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

