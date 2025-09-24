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
    const examId = searchParams.get('examId');
    const type = searchParams.get('type') || 'my-exams';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    const supabase = await createSupabaseClient();

    // If specific exam ID is provided, get that exam
    if (examId) {
      const { data: exam, error } = await supabase
        .from('exams')
        .select('*')
        .eq('exam_id', examId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Exam not found' },
            { status: 404 }
          );
        }
        console.error('Supabase error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch exam' },
          { status: 500 }
        );
      }

      // Check if user has access to this exam
      let hasAccess = 
        exam.creator_id === userId ||
        exam.is_public ||
        exam.collaborator_ids?.includes(userId);

      // If exam is part of classes, check class membership
      if (!hasAccess && exam.class_id && Array.isArray(exam.class_id) && exam.class_id.length > 0) {
        for (const classId of exam.class_id) {
          const { data: classData } = await supabase
            .from('class')
            .select('admin_ids, teacher_ids, student_ids')
            .eq('class_id', classId)
            .single();

          if (classData) {
            const isInClass = 
              classData.admin_ids?.includes(userId) ||
              classData.teacher_ids?.includes(userId) ||
              classData.student_ids?.includes(userId);
            
            if (isInClass) {
              hasAccess = true;
              break;
            }
          }
        }
      }

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      // Fetch class names if exam has classes
      let classNames = [];
      if (exam.class_id && Array.isArray(exam.class_id) && exam.class_id.length > 0) {
        const { data: classes } = await supabase
          .from('class')
          .select('class_id, class_name')
          .in('class_id', exam.class_id);
        
        if (classes) {
          classNames = classes.map(c => c.class_name);
        }
      }

      return NextResponse.json({ 
        success: true,
        data: {
          ...exam,
          class_names: classNames
        }
      });
    }

    // Otherwise, fetch exams based on type
    let query = supabase
      .from('exams')
      .select('*', { count: 'exact' });

    // Apply filters based on type
    switch (type) {
      case 'my-exams':
        query = query.eq('creator_id', userId);
        break;
      
      case 'public':
        // Show all public exams (both draft and published) from all users
        // You may want to filter by status='published' in production
        query = query
          .eq('is_public', true);
        break;
      
      case 'shared':
        query = query.contains('collaborator_ids', [userId]);
        break;
      
      default:
        // Default to user's own exams
        query = query.eq('creator_id', userId);
    }

    // Add search filter if provided
    if (search) {
      query = query.or(`exam_name.ilike.%${search}%,exam_description.ilike.%${search}%`);
    }

    // Add ordering and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      
      // Check if table doesn't exist
      if (error.message && error.message.includes('relation "exams" does not exist')) {
        return NextResponse.json(
          { 
            error: 'Database table not found',
            message: 'The exams table does not exist. Please create it using the schema in /supabaseSchema/exams.txt',
            details: error.message
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch exams', details: error.message },
        { status: 500 }
      );
    }

    // Collect all unique class IDs from all exams
    const allClassIds = [];
    for (const exam of data) {
      if (exam.class_id && Array.isArray(exam.class_id)) {
        allClassIds.push(...exam.class_id);
      }
    }
    const uniqueClassIds = [...new Set(allClassIds)];
    
    // Fetch all class names at once
    let classMap = {};
    if (uniqueClassIds.length > 0) {
      const { data: classes } = await supabase
        .from('class')
        .select('class_id, class_name')
        .in('class_id', uniqueClassIds);
      
      if (classes) {
        classMap = classes.reduce((acc, cls) => {
          acc[cls.class_id] = cls.class_name;
          return acc;
        }, {});
      }
    }
    
    // Format the response
    const formattedData = data.map(exam => {
      const classNames = [];
      if (exam.class_id && Array.isArray(exam.class_id)) {
        for (const classId of exam.class_id) {
          if (classMap[classId]) {
            classNames.push(classMap[classId]);
          }
        }
      }
      
      return {
        ...exam,
        class_names: classNames,
        items: exam.items || []
      };
    });

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
    console.error('Error fetching exams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}