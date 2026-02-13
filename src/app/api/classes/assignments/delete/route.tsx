import { NextResponse } from 'next/server';
import { createSupabaseClient, createSupabaseAdminClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

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
    const exam_id = searchParams.get('examId');
    const class_ids_param = searchParams.get('classIds');

    if (!exam_id || !class_ids_param) {
      return NextResponse.json(
        { error: 'Exam ID and class IDs are required' },
        { status: 400 }
      );
    }

    const class_ids = class_ids_param.split(',');

    const supabase = await createSupabaseClient();

    // Check if user has permission to modify assignments for these classes
    const { data: classesData, error: classesError } = await supabase
      .from('class')
      .select('class_id, admin_ids, teacher_ids, assignments')
      .in('class_id', class_ids);

    if (classesError || !classesData) {
      return NextResponse.json(
        { error: 'Failed to fetch classes' },
        { status: 500 }
      );
    }

    // Verify user has permission for all classes
    const unauthorizedClasses = classesData.filter(cls => {
      const isAdmin = cls.admin_ids?.includes(userId);
      const isTeacher = cls.teacher_ids?.includes(userId);
      return !isAdmin && !isTeacher;
    });

    if (unauthorizedClasses.length > 0) {
      return NextResponse.json(
        { error: 'You do not have permission to modify assignments for all selected classes' },
        { status: 403 }
      );
    }

    // Verify exam exists and user has permission
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('exam_id, creator_id, collaborator_ids')
      .eq('exam_id', exam_id)
      .single();

    if (examError || !examData) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    const hasExamPermission = 
      examData.creator_id === userId ||
      examData.collaborator_ids?.includes(userId);

    if (!hasExamPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this exam' },
        { status: 403 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    
    // Get assignment IDs for this exam
    const { data: assignmentsData, error: assignmentsError } = await supabaseAdmin
      .from('class_assignments')
      .select('assignment, exam_id')
      .eq('exam_id', exam_id);

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      );
    }

    const assignmentIds = assignmentsData?.map(a => a.assignment) || [];

    if (assignmentIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No assignments found to delete',
        deletedCount: 0
      });
    }

    // Remove assignment IDs from each class's assignments array
    const deletedFromClasses: string[] = [];
    
    for (const cls of classesData) {
      const currentAssignments = cls.assignments || [];
      const updatedAssignments = currentAssignments.filter(
        (assignId: string) => !assignmentIds.includes(assignId)
      );

      // Only update if there's a change
      if (currentAssignments.length !== updatedAssignments.length) {
        const { error: updateError } = await supabaseAdmin
          .from('class')
          .update({ 
            assignments: updatedAssignments,
            updated_at: new Date().toISOString()
          })
          .eq('class_id', cls.class_id);

        if (updateError) {
          console.error(`Error updating class ${cls.class_id}:`, updateError);
        } else {
          deletedFromClasses.push(cls.class_id);
          console.log(`Removed assignments from class ${cls.class_id}`);
        }
      }
    }

    // Delete the assignment records from class_assignments table
    const assignmentsToDelete = assignmentsData.filter(a => 
      classesData.some(cls => cls.assignments?.includes(a.assignment))
    );

    if (assignmentsToDelete.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from('class_assignments')
        .delete()
        .in('assignment', assignmentsToDelete.map(a => a.assignment));

      if (deleteError) {
        console.error('Error deleting assignments:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete assignments' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully removed exam from ${deletedFromClasses.length} class(es)`,
      deletedFromClasses,
      deletedCount: assignmentsToDelete.length
    });

  } catch (error) {
    console.error('Error deleting class assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

