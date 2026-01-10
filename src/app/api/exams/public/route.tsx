import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

/**
 * GET /api/exams/public
 *
 * Fetches a paginated list of public, published exams.
 *
 * @param request - The incoming HTTP request
 * @param request.url - URL with query parameters:
 *   - search (string, optional): Search term to filter exams by name or description
 *   - page (number, optional): Page number for pagination (default: 1)
 *   - limit (number, optional): Number of exams per page (default: 12)
 *
 * @returns JSON response with:
 *   - success: boolean
 *   - data: Array of exam objects
 *   - pagination: Object with page, limit, total, totalPages, hasMore
 *   - summary: Object with totalPublicExams, uniqueCreators, statuses
 *
 * @example
 * GET /api/exams/public?search=math&page=1&limit=10
 *
 * @throws {500} If database query fails
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
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

    // Get creator information (optional - you might want to fetch user names)
    const creatorIds = [...new Set(data.map(exam => exam.creator_id))];

    return NextResponse.json({
      success: true,
      data,
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