import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

interface RouteParams {
  params: Promise<{ classId: string }>;
}

// Helper to check if user has access to class
async function checkClassAccess(supabase: any, classId: string, userId: string) {
  // Check if user is creator
  const { data: classData } = await supabase
    .from('classes')
    .select('created_by, class_name')
    .eq('class_id', classId)
    .single();

  if (!classData) {
    return { hasAccess: false, isOwner: false, role: null, error: 'Class not found' };
  }

  if (classData.created_by === userId) {
    return { hasAccess: true, isOwner: true, role: 'owner', classData };
  }

  // Check if user is a member
  const { data: memberData } = await supabase
    .from('class_members')
    .select('role, status')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (memberData) {
    return {
      hasAccess: true,
      isOwner: false,
      role: memberData.role,
      isTeacher: ['teacher', 'co-teacher'].includes(memberData.role),
      classData
    };
  }

  return { hasAccess: false, isOwner: false, role: null, classData };
}

// GET: Get class details
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

    // Check access
    const access = await checkClassAccess(supabase, classId, userId);
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: access.error || 'Access denied' },
        { status: access.error === 'Class not found' ? 404 : 403 }
      );
    }

    // Get full class details
    const { data: classData, error } = await supabase
      .from('classes')
      .select(`
        *,
        class_members(
          member_id,
          user_id,
          email,
          display_name,
          role,
          status,
          joined_at
        ),
        class_exams(
          id,
          exam_id,
          start_date,
          end_date,
          points_possible,
          status,
          sort_order,
          exams(
            exam_id,
            exam_name,
            exam_description,
            duration_minutes,
            total_points
          )
        ),
        class_announcements(
          announcement_id,
          title,
          content,
          pinned,
          created_by,
          created_at
        )
      `)
      .eq('class_id', classId)
      .single();

    // Fetch user details for all members
    if (classData?.class_members && classData.class_members.length > 0) {
      const userIds = classData.class_members
        .filter((m: any) => m.user_id)
        .map((m: any) => m.user_id);

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('user')
          .select('user_id, full_name, first_name, last_name, email, img_url')
          .in('user_id', userIds);

        // Map user data to members
        const userMap = new Map(users?.map((u: any) => [u.user_id, u]) || []);
        classData.class_members = classData.class_members.map((member: any) => {
          const userData = userMap.get(member.user_id);
          return {
            ...member,
            full_name: userData?.full_name || member.display_name,
            first_name: userData?.first_name,
            last_name: userData?.last_name,
            user_email: userData?.email || member.email,
            img_url: userData?.img_url
          };
        });
      }
    }

    // Fetch owner info
    const { data: ownerData } = await supabase
      .from('user')
      .select('user_id, full_name, first_name, last_name, email, img_url')
      .eq('user_id', classData?.created_by)
      .single();

    if (ownerData) {
      classData.owner_info = ownerData;
    }

    if (error) {
      console.error('Error fetching class:', error);
      return NextResponse.json(
        { error: 'Failed to fetch class' },
        { status: 500 }
      );
    }

    // Get member counts by role
    const members = classData.class_members || [];
    const teacherCount = members.filter((m: any) =>
      ['teacher', 'co-teacher'].includes(m.role) && m.status === 'active'
    ).length;
    const studentCount = members.filter((m: any) =>
      m.role === 'student' && m.status === 'active'
    ).length;

    // Sort announcements (pinned first, then by date)
    const announcements = (classData.class_announcements || []).sort((a: any, b: any) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Sort exams by sort_order
    const exams = (classData.class_exams || []).sort((a: any, b: any) =>
      (a.sort_order || 0) - (b.sort_order || 0)
    );

    return NextResponse.json({
      success: true,
      data: {
        ...classData,
        user_role: access.role,
        is_owner: access.isOwner,
        is_teacher: access.isTeacher || access.isOwner,
        member_count: members.length,
        teacher_count: teacherCount,
        student_count: studentCount,
        class_members: access.isTeacher || access.isOwner ? members : undefined,
        class_exams: exams,
        class_announcements: announcements
      }
    });

  } catch (error) {
    console.error('Error fetching class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Update class
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

    const supabase = createSupabaseAdminClient();

    // Check access (only owner or teachers can update)
    const access = await checkClassAccess(supabase, classId, userId);
    if (!access.hasAccess || (!access.isOwner && !access.isTeacher)) {
      return NextResponse.json(
        { error: 'Only class owners or teachers can update the class' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const allowedFields = [
      'class_name',
      'class_description',
      'banner_color',
      'banner_image',
      'allow_join_by_code',
      'auto_accept_students',
      'google_sync_enabled',
      'status'
    ];

    // Filter only allowed fields
    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Validate class_name if provided
    if (updateData.class_name !== undefined && updateData.class_name.trim() === '') {
      return NextResponse.json(
        { error: 'Class name cannot be empty' },
        { status: 400 }
      );
    }

    // Update the class
    const { data, error } = await supabase
      .from('classes')
      .update(updateData)
      .eq('class_id', classId)
      .select()
      .single();

    if (error) {
      console.error('Error updating class:', error);
      return NextResponse.json(
        { error: 'Failed to update class' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error updating class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Archive or delete class
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
    const permanent = searchParams.get('permanent') === 'true';

    const supabase = createSupabaseAdminClient();

    // Check access (only owner can delete)
    const access = await checkClassAccess(supabase, classId, userId);
    if (!access.isOwner) {
      return NextResponse.json(
        { error: 'Only class owner can delete the class' },
        { status: 403 }
      );
    }

    if (permanent) {
      // Permanently delete class (cascade will handle related records)
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('class_id', classId);

      if (error) {
        console.error('Error deleting class:', error);
        return NextResponse.json(
          { error: 'Failed to delete class' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Class permanently deleted'
      });
    } else {
      // Archive the class (soft delete)
      const { data, error } = await supabase
        .from('classes')
        .update({ status: 'archived' })
        .eq('class_id', classId)
        .select()
        .single();

      if (error) {
        console.error('Error archiving class:', error);
        return NextResponse.json(
          { error: 'Failed to archive class' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Class archived',
        data
      });
    }

  } catch (error) {
    console.error('Error deleting class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
