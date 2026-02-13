import { NextResponse } from 'next/server';
import { createSupabaseClient, createSupabaseAdminClient } from '@/lib/supabase';
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
    const classId = searchParams.get('classId');

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Verify user has access to this class
    const { data: classData, error: classError } = await supabase
      .from('class')
      .select('admin_ids, teacher_ids, student_ids')
      .eq('class_id', classId)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    const isAdmin = classData.admin_ids?.includes(userId);
    const isTeacher = classData.teacher_ids?.includes(userId);
    const isStudent = classData.student_ids?.includes(userId);

    if (!isAdmin && !isTeacher && !isStudent) {
      return NextResponse.json(
        { error: 'You do not have access to this class' },
        { status: 403 }
      );
    }

    // Use admin client to bypass RLS for querying assignments
    const supabaseAdmin = createSupabaseAdminClient();
    
    console.log('📥 Fetching assignments for class:', classId);
    
    // First, get the assignment IDs from the class's assignments array
    const { data: classAssignmentsData, error: fetchClassError } = await supabaseAdmin
      .from('class')
      .select('assignments')
      .eq('class_id', classId)
      .single();

    if (fetchClassError) {
      console.error('❌ Error fetching class:', fetchClassError);
      return NextResponse.json(
        { error: 'Failed to fetch class data', details: fetchClassError.message },
        { status: 500 }
      );
    }

    const assignmentIds = classAssignmentsData?.assignments || [];
    console.log('📋 Class has assignment IDs:', assignmentIds);

    if (assignmentIds.length === 0) {
      console.log('ℹ️  No assignments found for this class');
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Fetch the actual assignment data
    const { data: assignmentsData, error: assignmentsError } = await supabaseAdmin
      .from('class_assignments')
      .select(`
        assignment,
        name,
        description,
        exam_id,
        student_attempt_data,
        student_public_chat,
        due_at,
        publish_at,
        created_at
      `)
      .in('assignment', assignmentIds)
      .order('created_at', { ascending: false });

    if (assignmentsError) {
      console.error('❌ Error fetching assignments:', assignmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch assignments', details: assignmentsError.message },
        { status: 500 }
      );
    }

    console.log('📦 Found assignments:', assignmentsData?.length || 0);

    // Fetch exam details for all assignments
    const examIds = assignmentsData?.map(a => a.exam_id).filter(Boolean) || [];
    
    if (examIds.length === 0) {
      console.log('ℹ️  No exam IDs found');
      return NextResponse.json({
        success: true,
        data: assignmentsData
      });
    }

    console.log('🔍 Fetching exam details for IDs:', examIds);

    const { data: examsData, error: examsError } = await supabaseAdmin
      .from('exams')
      .select('exam_id, exam_name, exam_description, duration_minutes, total_points, status, is_public')
      .in('exam_id', examIds);

    if (examsError) {
      console.error('❌ Error fetching exams:', examsError);
      return NextResponse.json(
        { error: 'Failed to fetch exam details', details: examsError.message },
        { status: 500 }
      );
    }

    console.log('📚 Found exams:', examsData?.length || 0);

    // Combine assignments with their exam data
    const assignmentsWithExams = assignmentsData.map(assignment => {
      const exam = examsData?.find(e => e.exam_id === assignment.exam_id);
      
      return {
        ...assignment,
        exam: exam ? {
          exam_id: exam.exam_id,
          exam_name: exam.exam_name,
          exam_description: exam.exam_description,
          duration_minutes: exam.duration_minutes,
          total_points: exam.total_points,
          status: exam.status,
          is_public: exam.is_public
        } : null
      };
    });

    console.log('✅ Returning assignments for this class:', assignmentsWithExams.length);

    return NextResponse.json({
      success: true,
      data: assignmentsWithExams
    });

  } catch (error) {
    console.error('Error fetching class assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

