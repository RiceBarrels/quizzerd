import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { class_id, member_id, action, new_role } = body;

    if (!class_id || !member_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = await createSupabaseClient();

    // Get the class
    const { data: classData, error: fetchError } = await supabase
      .from('class')
      .select('*')
      .eq('class_id', class_id)
      .single();

    console.log('Fetched class data:', classData);
    console.log('Fetch error:', fetchError);

    if (fetchError) {
      console.error('Error fetching class:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch class' },
        { status: 500 }
      );
    }

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Check if user is an admin
    if (!classData.admin_ids?.includes(userId)) {
      return NextResponse.json(
        { error: 'Only admins can manage members' },
        { status: 403 }
      );
    }

    // Prevent admin from removing/changing themselves
    if (member_id === userId) {
      return NextResponse.json(
        { error: 'You cannot modify your own role' },
        { status: 400 }
      );
    }

    let updatedData: any = {};

    if (action === 'remove') {
      // Remove member from all role arrays
      const admin_ids = (classData.admin_ids || []).filter((id: string) => id !== member_id);
      const teacher_ids = (classData.teacher_ids || []).filter((id: string) => id !== member_id);
      const student_ids = (classData.student_ids || []).filter((id: string) => id !== member_id);

      updatedData = {
        admin_ids,
        teacher_ids,
        student_ids
      };
    } else if (action === 'change_role') {
      if (!new_role || !['admin', 'teacher', 'student'].includes(new_role)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
      }

      // Remove member from all arrays first
      let admin_ids = (classData.admin_ids || []).filter((id: string) => id !== member_id);
      let teacher_ids = (classData.teacher_ids || []).filter((id: string) => id !== member_id);
      let student_ids = (classData.student_ids || []).filter((id: string) => id !== member_id);

      // Add to new role array
      if (new_role === 'admin') {
        admin_ids.push(member_id);
      } else if (new_role === 'teacher') {
        teacher_ids.push(member_id);
      } else if (new_role === 'student') {
        student_ids.push(member_id);
      }

      updatedData = {
        admin_ids,
        teacher_ids,
        student_ids
      };
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Update the class
    const { data: updateData, error: updateError } = await supabase
      .from('class')
      .update(updatedData)
      .eq('class_id', class_id)
      .select()
      .single();

    console.log('Update data:', updateData);
    console.log('Update error:', updateError);
    console.log('Updated data payload:', updatedData);

    if (updateError) {
      console.error('Error updating class:', updateError);
      return NextResponse.json(
        { error: 'Failed to update class', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: action === 'remove' ? 'Member removed successfully' : 'Role updated successfully',
      data: updateData
    });

  } catch (error) {
    console.error('Error managing member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

