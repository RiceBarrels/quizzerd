import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.error('Delete class - Unauthorized: No userId');
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { class_id } = body;

    console.log('Delete class request:', { class_id, userId });

    if (!class_id) {
      console.error('Delete class - No class_id provided');
      return NextResponse.json(
        { error: 'Class ID is required', success: false },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Check if user is admin of this class
    const { data: classData, error: fetchError } = await supabase
      .from('class')
      .select('admin_ids, class_name')
      .eq('class_id', class_id)
      .single();

    if (fetchError || !classData) {
      console.error('Delete class - Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Class not found', details: fetchError?.message, success: false },
        { status: 404 }
      );
    }

    // Only admins can delete classes
    const isAdmin = classData.admin_ids?.includes(userId);

    if (!isAdmin) {
      console.error('Delete class - Permission denied:', { userId, isAdmin });
      return NextResponse.json(
        { error: 'Only admins can delete classes', success: false },
        { status: 403 }
      );
    }

    // Delete the class (this should cascade delete related data based on your DB schema)
    const { error: deleteError } = await supabase
      .from('class')
      .delete()
      .eq('class_id', class_id);

    if (deleteError) {
      console.error('Supabase delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete class', details: deleteError.message, success: false },
        { status: 500 }
      );
    }

    console.log('Class deleted successfully:', { class_id, class_name: classData.class_name });

    return NextResponse.json({
      success: true,
      message: 'Class deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error deleting class:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error', success: false },
      { status: 500 }
    );
  }
}

