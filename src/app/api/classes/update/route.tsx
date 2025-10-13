import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.error('Update class - Unauthorized: No userId');
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { class_id, theme, ...otherUpdates } = body;

    console.log('Update class request:', { class_id, theme, userId });

    if (!class_id) {
      console.error('Update class - No class_id provided');
      return NextResponse.json(
        { error: 'Class ID is required', success: false },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Check if user has permission to update this class
    const { data: classData, error: fetchError } = await supabase
      .from('class')
      .select('admin_ids, teacher_ids, class_settings')
      .eq('class_id', class_id)
      .single();

    if (fetchError) {
      console.error('Update class - Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Class not found', details: fetchError.message, success: false },
        { status: 404 }
      );
    }

    if (!classData) {
      console.error('Update class - No class data returned');
      return NextResponse.json(
        { error: 'Class not found', success: false },
        { status: 404 }
      );
    }

    console.log('Class data fetched:', { 
      class_id, 
      hasAdmin: !!classData.admin_ids, 
      hasTeacher: !!classData.teacher_ids,
      hasSettings: !!classData.class_settings
    });

    // Check if user is admin or teacher
    const isAdmin = classData.admin_ids?.includes(userId);
    const isTeacher = classData.teacher_ids?.includes(userId);

    console.log('Permission check:', { userId, isAdmin, isTeacher });

    if (!isAdmin && !isTeacher) {
      console.error('Update class - Permission denied:', { userId, isAdmin, isTeacher });
      return NextResponse.json(
        { error: 'You do not have permission to update this class', success: false },
        { status: 403 }
      );
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    };

    // Handle theme update by merging with existing class_settings
    if (theme !== undefined) {
      const currentSettings = classData.class_settings || { themeFont: 'default', themeColor: '#bc6a4a' };
      updates.class_settings = {
        ...currentSettings,
        theme: theme
      };
      console.log('Theme update prepared:', { currentSettings, newSettings: updates.class_settings });
    }

    // Add other updates if provided
    Object.keys(otherUpdates).forEach(key => {
      if (otherUpdates[key] !== undefined) {
        updates[key] = otherUpdates[key];
      }
    });

    console.log('Final updates object:', updates);

    // Update the class
    const { data, error } = await supabase
      .from('class')
      .update(updates)
      .eq('class_id', class_id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { error: 'Failed to update class', details: error.message, success: false },
        { status: 500 }
      );
    }

    console.log('Class updated successfully:', { class_id, theme });

    return NextResponse.json({
      success: true,
      data,
      message: 'Class updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error updating class:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error', success: false },
      { status: 500 }
    );
  }
}

