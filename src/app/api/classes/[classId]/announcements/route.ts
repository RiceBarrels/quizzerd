import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

interface RouteParams {
  params: Promise<{ classId: string }>;
}

// Helper to check if user is a class member
async function checkMemberAccess(supabase: any, classId: string, userId: string) {
  // Check if user is creator
  const { data: classData } = await supabase
    .from('classes')
    .select('created_by')
    .eq('class_id', classId)
    .single();

  if (!classData) {
    return { hasAccess: false, error: 'Class not found' };
  }

  if (classData.created_by === userId) {
    return { hasAccess: true, isTeacher: true, isOwner: true };
  }

  // Check membership
  const { data: memberData } = await supabase
    .from('class_members')
    .select('role, status')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (memberData) {
    const isTeacher = ['teacher', 'co-teacher'].includes(memberData.role);
    return { hasAccess: true, isTeacher, isOwner: false };
  }

  return { hasAccess: false };
}

// GET: List announcements
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { classId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check member access
    const access = await checkMemberAccess(supabase, classId, userId);
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'You are not a member of this class' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get announcements
    const { data: announcements, error, count } = await supabase
      .from('class_announcements')
      .select('*', { count: 'exact' })
      .eq('class_id', classId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: announcements,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create announcement
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { classId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check teacher access
    const access = await checkMemberAccess(supabase, classId, userId);
    if (!access.hasAccess || !access.isTeacher) {
      return NextResponse.json(
        { error: 'Only teachers can create announcements' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, pinned = false, attachments = [] } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Announcement content is required' },
        { status: 400 }
      );
    }

    // Create announcement
    const { data: announcement, error } = await supabase
      .from('class_announcements')
      .insert({
        class_id: classId,
        title: title?.trim() || null,
        content: content.trim(),
        pinned,
        attachments,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return NextResponse.json(
        { error: 'Failed to create announcement' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: announcement
    });

  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update announcement
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { classId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { announcementId, title, content, pinned, attachments } = body;

    if (!announcementId) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check teacher access
    const access = await checkMemberAccess(supabase, classId, userId);
    if (!access.hasAccess || !access.isTeacher) {
      return NextResponse.json(
        { error: 'Only teachers can update announcements' },
        { status: 403 }
      );
    }

    // Verify announcement belongs to this class
    const { data: existing } = await supabase
      .from('class_announcements')
      .select('announcement_id')
      .eq('announcement_id', announcementId)
      .eq('class_id', classId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title?.trim() || null;
    if (content !== undefined) {
      if (!content || content.trim() === '') {
        return NextResponse.json(
          { error: 'Announcement content cannot be empty' },
          { status: 400 }
        );
      }
      updateData.content = content.trim();
    }
    if (pinned !== undefined) updateData.pinned = pinned;
    if (attachments !== undefined) updateData.attachments = attachments;

    const { data: announcement, error } = await supabase
      .from('class_announcements')
      .update(updateData)
      .eq('announcement_id', announcementId)
      .select()
      .single();

    if (error) {
      console.error('Error updating announcement:', error);
      return NextResponse.json(
        { error: 'Failed to update announcement' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: announcement
    });

  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete announcement
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { classId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const announcementId = searchParams.get('announcementId');

    if (!announcementId) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check teacher access
    const access = await checkMemberAccess(supabase, classId, userId);
    if (!access.hasAccess || !access.isTeacher) {
      return NextResponse.json(
        { error: 'Only teachers can delete announcements' },
        { status: 403 }
      );
    }

    // Delete announcement
    const { error } = await supabase
      .from('class_announcements')
      .delete()
      .eq('announcement_id', announcementId)
      .eq('class_id', classId);

    if (error) {
      console.error('Error deleting announcement:', error);
      return NextResponse.json(
        { error: 'Failed to delete announcement' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
