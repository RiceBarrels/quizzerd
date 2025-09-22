import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function PUT(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { exam_id, ...updateData } = body;

    if (!exam_id) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // First, check if the user has permission to update this exam
    const { data: examData, error: fetchError } = await supabase
      .from('exams')
      .select('creator_id, collaborator_ids, class_id')
      .eq('exam_id', exam_id)
      .single();

    if (fetchError || !examData) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to edit
    let hasPermission = 
      examData.creator_id === userId ||
      examData.collaborator_ids?.includes(userId);

    // If exam belongs to classes, check if user is admin/teacher of any of them
    if (!hasPermission && examData.class_id && Array.isArray(examData.class_id) && examData.class_id.length > 0) {
      for (const classId of examData.class_id) {
        const { data: classData } = await supabase
          .from('class')
          .select('admin_ids, teacher_ids')
          .eq('class_id', classId)
          .single();

        if (classData) {
          const isAuthorized = 
            classData.admin_ids?.includes(userId) ||
            classData.teacher_ids?.includes(userId);
          
          if (isAuthorized) {
            hasPermission = true;
            break;
          }
        }
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to update this exam' },
        { status: 403 }
      );
    }

    // If updating class_ids, validate them
    if (updateData.class_ids !== undefined) {
      const validClassIds = [];
      if (Array.isArray(updateData.class_ids) && updateData.class_ids.length > 0) {
        for (const classId of updateData.class_ids) {
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
            const hasClassPermission = 
              classData.admin_ids?.includes(userId) ||
              classData.teacher_ids?.includes(userId);

            if (!hasClassPermission) {
              return NextResponse.json(
                { error: `You must be an admin or teacher to assign exam to class: ${classId}` },
                { status: 403 }
              );
            }
            
            validClassIds.push(classId);
          }
        }
      }
      updateData.class_id = validClassIds;
      delete updateData.class_ids;
    }

    // Rename subjects to subject if provided
    if (updateData.subjects !== undefined) {
      updateData.subject = updateData.subjects;
      delete updateData.subjects;
    }

    // Update the exam
    const { data, error } = await supabase
      .from('exams')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('exam_id', exam_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating exam:', error);
      return NextResponse.json(
        { error: 'Failed to update exam' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error updating exam:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}