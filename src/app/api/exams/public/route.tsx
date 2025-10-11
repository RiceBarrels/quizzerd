import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const includeClasses = searchParams.get('includeClasses') === 'true';
    const offset = (page - 1) * limit;

    const supabase = await createSupabaseClient();

    // Fetch all public exams
    let query = supabase
      .from('exams')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      query = query.or(`exam_name.ilike.%${search}%,exam_description.ilike.%${search}%`);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch public exams', details: error.message },
        { status: 500 }
      );
    }

    // Optionally fetch class names
    let formattedData = data;
    if (includeClasses) {
      // Collect all unique class IDs
      const allClassIds = [];
      for (const exam of data) {
        if (exam.class_id && Array.isArray(exam.class_id)) {
          allClassIds.push(...exam.class_id);
        }
      }
      const uniqueClassIds = [...new Set(allClassIds)];
      
      // Fetch all class names at once
      let classMap: any = {};
      if (uniqueClassIds.length > 0) {
        const { data: classes } = await supabase
          .from('class')
          .select('class_id, class_name')
          .in('class_id', uniqueClassIds);
        
        if (classes) {
          classMap = classes.reduce((acc: any, cls: any) => {
            acc[cls.class_id] = cls.class_name;
            return acc;
          }, {} as any);
        }
      }
      
      // Format the response with class names
      formattedData = data.map(exam => {
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
          questions: exam.questions || []
        };
      });
    }

    // Get creator information (optional - you might want to fetch user names)
    const creatorIds = [...new Set(data.map(exam => exam.creator_id))];
    
    return NextResponse.json({ 
      success: true,
      data: formattedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0)
      },
      summary: {
        totalPublicExams: count || 0,
        uniqueCreators: creatorIds.length,
        statuses: {
          draft: data.filter(e => e.status === 'draft').length,
          published: data.filter(e => e.status === 'published').length,
          archived: data.filter(e => e.status === 'archived').length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching public exams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}