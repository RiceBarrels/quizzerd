import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function GET(request) {
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
    const classCode = searchParams.get('classCode');
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Create Supabase client
    const supabase = await createSupabaseClient();

    // If specific classCode or classId is provided, get that class
    if (classCode || classId) {
      const { data, error } = await supabase
        .from('class')
        .select('*')
        .eq(classCode ? 'class_code' : 'class_id', classCode || classId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Class not found' },
            { status: 404 }
          );
        }
        console.error('Supabase error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch class' },
          { status: 500 }
        );
      }

      // Check if user has access to this class
      const hasAccess = 
        data.admin_ids?.includes(userId) ||
        data.teacher_ids?.includes(userId) ||
        data.student_ids?.includes(userId);

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      // Add role information to the response
      const responseData = {
        ...data,
        role: data.admin_ids?.includes(userId) ? 'admin' : 
              data.teacher_ids?.includes(userId) ? 'teacher' : 'student'
      };

      return NextResponse.json({ 
        success: true,
        data: responseData
      });
    }

    // Otherwise, get all classes the user has access to
    // Using contains (@>) operator for JSONB arrays - the array contains the userId string
    let query = supabase
      .from('class')
      .select('*', { count: 'exact' })
      .or(`admin_ids.cs.[${JSON.stringify(userId)}],teacher_ids.cs.[${JSON.stringify(userId)}],student_ids.cs.[${JSON.stringify(userId)}]`);

    // Add search filter if provided
    if (search) {
      query = query.ilike('class_name', `%${search}%`);
    }

    // Filter out archived classes unless specifically requested
    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }

    // Add ordering and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch classes' },
        { status: 500 }
      );
    }

    // Format the response with additional metadata
    const formattedData = data.map(classItem => ({
      ...classItem,
      role: classItem.admin_ids?.includes(userId) ? 'admin' : 
            classItem.teacher_ids?.includes(userId) ? 'teacher' : 'student',
      member_count: 
        (classItem.admin_ids?.length || 0) + 
        (classItem.teacher_ids?.length || 0) + 
        (classItem.student_ids?.length || 0)
    }));

    return NextResponse.json({ 
      success: true,
      data: formattedData,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasMore: offset + limit < count
      }
    });

  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}