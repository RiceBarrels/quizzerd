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
    const { exam_id, status } = body;

    if (!exam_id) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    if (!status || !['draft', 'published', 'archived'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (draft, published, archived)' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Check if user has permission to update this exam
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

    // Update the exam status
    const { data, error } = await supabase
      .from('exams')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('exam_id', exam_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating exam status:', error);
      return NextResponse.json(
        { error: 'Failed to update exam status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: `Exam ${status === 'published' ? 'published' : status === 'archived' ? 'archived' : 'set to draft'} successfully`
    });

  } catch (error) {
    console.error('Error updating exam status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}