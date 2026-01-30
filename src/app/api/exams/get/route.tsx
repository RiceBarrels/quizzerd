import { NextResponse } from 'next/server';
import { createSupabaseClient, createPublicSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const type = searchParams.get('type') || 'my-exams';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // For public routes, we don't need authentication
    if (type === 'public') {
      // Use public client for unauthenticated access
      const supabase = createPublicSupabaseClient();

      let query = supabase
        .from('exams')
        .select('*', { count: 'exact' })
        .eq('is_public', true);

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
        return NextResponse.json(
          { error: 'Failed to fetch public exams', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: offset + limit < (count || 0)
        }
      });
    }

    // For non-public routes, require authentication
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (authError) {
      // Auth failed
      console.log('Auth check failed');
    }

    // Require authentication for private content
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
      let hasAccess = exam.is_public; // Public exams are accessible to everyone

      // For authenticated users, check additional permissions
      if (userId) {
        hasAccess = hasAccess ||
          exam.creator_id === userId ||
          exam.collaborator_ids?.includes(userId);

        // Check if user's email is in allowed_emails (Google Classroom whitelist)
        if (!hasAccess && exam.allowed_emails && Array.isArray(exam.allowed_emails) && exam.allowed_emails.length > 0) {
          const { data: userData } = await supabase
            .from('user')
            .select('email')
            .eq('user_id', userId)
            .single();

          if (userData?.email) {
            const userEmail = userData.email.toLowerCase();
            hasAccess = exam.allowed_emails.some(
              (email: string) => email.toLowerCase() === userEmail
            );
          }
        }
      }

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        data: exam
      });
    }

    // Otherwise, fetch exams based on type
    let query = supabase
      .from('exams')
      .select('*', { count: 'exact' });

    // Apply filters based on type (public is handled above)
    switch (type) {
      case 'my-exams':
        query = query.eq('creator_id', userId);
        break;
      
      case 'shared':
        // Use cs (contains) operator - collaborator_ids must contain userId
        // Also filter out nulls to prevent errors
        query = query
          .not('collaborator_ids', 'is', null)
          .contains('collaborator_ids', [userId]);
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

    // Format the response
    const formattedData = data.map(exam => ({
      ...exam,
      items: exam.items || []
    }));

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0)
      }
    });

  } catch (error) {
    console.error('Error fetching exams:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}