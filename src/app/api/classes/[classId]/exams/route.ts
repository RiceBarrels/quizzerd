import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

interface RouteParams {
  params: Promise<{ classId: string }>;
}

// Helper to check teacher access
async function checkTeacherAccess(supabase: any, classId: string, userId: string) {
  // Check if user is creator
  const { data: classData } = await supabase
    .from('classes')
    .select('created_by')
    .eq('class_id', classId)
    .single();

  if (!classData) {
    return { hasAccess: false, error: 'Class not found' };
  }

  if (classData.created_by === userId) {
    return { hasAccess: true, isOwner: true };
  }

  // Check if user is a teacher/co-teacher
  const { data: memberData } = await supabase
    .from('class_members')
    .select('role, status')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .in('role', ['teacher', 'co-teacher'])
    .eq('status', 'active')
    .single();

  if (memberData) {
    return { hasAccess: true, isOwner: false };
  }

  return { hasAccess: false };
}

// Helper to check member access
async function checkMemberAccess(supabase: any, classId: string, userId: string) {
  // Check if user is creator
  const { data: classData } = await supabase
    .from('classes')
    .select('created_by')
    .eq('class_id', classId)
    .single();

  if (!classData) {
    return { hasAccess: false, error: 'Class not found' };
  }

  if (classData.created_by === userId) {
    return { hasAccess: true, isTeacher: true };
  }

  // Check membership
  const { data: memberData } = await supabase
    .from('class_members')
    .select('role, status')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (memberData) {
    const isTeacher = ['teacher', 'co-teacher'].includes(memberData.role);
    return { hasAccess: true, isTeacher };
  }

  return { hasAccess: false };
}

// GET: List exams in class
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { classId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check member access
    const access = await checkMemberAccess(supabase, classId, userId);
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'You are not a member of this class' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // draft, published, closed, all

    // Build query for class exams with exam details
    let query = supabase
      .from('class_exams')
      .select(`
        *,
        exams (
          exam_id,
          exam_name,
          exam_description,
          question_count,
          duration_minutes,
          creator_id
        )
      `)
      .eq('class_id', classId);

    // Non-teachers can only see published exams
    if (!access.isTeacher) {
      query = query.eq('status', 'published');
    } else if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('sort_order').order('created_at', { ascending: false });

    const { data: classExams, error } = await query;

    if (error) {
      console.error('Error fetching class exams:', error);
      return NextResponse.json(
        { error: 'Failed to fetch exams' },
        { status: 500 }
      );
    }

    // Get attempt counts for each exam if teacher
    let examsWithStats = classExams;
    if (access.isTeacher && classExams && classExams.length > 0) {
      const examIds = classExams.map(ce => ce.exam_id);

      // Get attempt counts
      const { data: attemptCounts } = await supabase
        .from('exam_attempts')
        .select('exam_id')
        .eq('class_id', classId)
        .in('exam_id', examIds);

      const countMap = attemptCounts?.reduce((acc: any, attempt: any) => {
        acc[attempt.exam_id] = (acc[attempt.exam_id] || 0) + 1;
        return acc;
      }, {}) || {};

      examsWithStats = classExams.map(ce => ({
        ...ce,
        attempt_count: countMap[ce.exam_id] || 0
      }));
    }

    return NextResponse.json({
      success: true,
      data: examsWithStats
    });

  } catch (error) {
    console.error('Error fetching class exams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Add exam to class
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { classId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check teacher access
    const access = await checkTeacherAccess(supabase, classId, userId);
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Only teachers can add exams to class' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      exam_id,
      start_date,
      end_date,
      points_possible,
      status = 'draft',
      sort_order = 0
    } = body;

    if (!exam_id) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    // Verify exam exists and user owns it
    const { data: exam } = await supabase
      .from('exams')
      .select('exam_id, creator_id')
      .eq('exam_id', exam_id)
      .single();

    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    if (exam.creator_id !== userId) {
      return NextResponse.json(
        { error: 'You can only add your own exams to a class' },
        { status: 403 }
      );
    }

    // Check if exam is already in this class
    const { data: existing } = await supabase
      .from('class_exams')
      .select('id')
      .eq('class_id', classId)
      .eq('exam_id', exam_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'This exam is already in this class' },
        { status: 400 }
      );
    }

    // Add exam to class
    const { data: classExam, error } = await supabase
      .from('class_exams')
      .insert({
        class_id: classId,
        exam_id,
        start_date: start_date || null,
        end_date: end_date || null,
        points_possible: points_possible || null,
        status,
        sort_order
      })
      .select(`
        *,
        exams (
          exam_id,
          exam_name,
          exam_description,
          question_count,
          duration_minutes
        )
      `)
      .single();

    if (error) {
      console.error('Error adding exam to class:', error);
      return NextResponse.json(
        { error: 'Failed to add exam to class' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: classExam
    });

  } catch (error) {
    console.error('Error adding exam to class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update class exam settings
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { classId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      class_exam_id,
      start_date,
      end_date,
      points_possible,
      status,
      sort_order
    } = body;

    if (!class_exam_id) {
      return NextResponse.json(
        { error: 'Class exam ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check teacher access
    const access = await checkTeacherAccess(supabase, classId, userId);
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Only teachers can update class exams' },
        { status: 403 }
      );
    }

    // Verify class exam exists and belongs to this class
    const { data: existing } = await supabase
      .from('class_exams')
      .select('id')
      .eq('id', class_exam_id)
      .eq('class_id', classId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Class exam not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {};

    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (points_possible !== undefined) updateData.points_possible = points_possible;
    if (status !== undefined) {
      const validStatuses = ['draft', 'published', 'closed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: classExam, error } = await supabase
      .from('class_exams')
      .update(updateData)
      .eq('id', class_exam_id)
      .select(`
        *,
        exams (
          exam_id,
          exam_name,
          exam_description,
          question_count,
          duration_minutes
        )
      `)
      .single();

    if (error) {
      console.error('Error updating class exam:', error);
      return NextResponse.json(
        { error: 'Failed to update class exam' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: classExam
    });

  } catch (error) {
    console.error('Error updating class exam:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove exam from class
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { classId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const classExamId = searchParams.get('classExamId');

    if (!classExamId) {
      return NextResponse.json(
        { error: 'Class exam ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check teacher access
    const access = await checkTeacherAccess(supabase, classId, userId);
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Only teachers can remove exams from class' },
        { status: 403 }
      );
    }

    // Delete class exam (this doesn't delete the exam itself)
    const { error } = await supabase
      .from('class_exams')
      .delete()
      .eq('id', classExamId)
      .eq('class_id', classId);

    if (error) {
      console.error('Error removing exam from class:', error);
      return NextResponse.json(
        { error: 'Failed to remove exam from class' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Exam removed from class successfully'
    });

  } catch (error) {
    console.error('Error removing exam from class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
