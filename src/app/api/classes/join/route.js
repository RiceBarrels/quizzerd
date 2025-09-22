import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export async function POST(request) {
  try {
    const { classCode, userId, role = 'student' } = await request.json();

    if (!classCode || !userId) {
      return NextResponse.json(
        { error: 'Class code and user ID are required' },
        { status: 400 }
      );
    }

    // Get the class by code
    const { data: classData, error: fetchError } = await supabase
      .from('class')
      .select('*')
      .eq('class_code', classCode)
      .single();

    if (fetchError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Check if user is already in the class
    const isAlreadyStudent = classData.student_ids.includes(userId);
    const isAlreadyTeacher = classData.teacher_ids.includes(userId);
    const isAlreadyAdmin = classData.admin_ids.includes(userId);

    if (isAlreadyStudent || isAlreadyTeacher || isAlreadyAdmin) {
      return NextResponse.json(
        { error: 'User is already a member of this class' },
        { status: 400 }
      );
    }

    // Add user to the appropriate array based on role
    let updateData = {};
    if (role === 'student') {
      updateData.student_ids = [...classData.student_ids, userId];
    } else if (role === 'teacher') {
      updateData.teacher_ids = [...classData.teacher_ids, userId];
    } else if (role === 'admin') {
      updateData.admin_ids = [...classData.admin_ids, userId];
    } else {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Update the class with the new member
    const { data: updatedClass, error: updateError } = await supabase
      .from('class')
      .update(updateData)
      .eq('class_id', classData.class_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to join class' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Successfully joined class',
        class: updatedClass 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Join class error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}