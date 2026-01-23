import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

interface RouteParams {
  params: Promise<{ classId: string }>;
}

// Helper to check if user is teacher/owner
async function checkTeacherAccess(supabase: any, classId: string, userId: string) {
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
    return { hasAccess: true, isOwner: true };
  }

  // Check if user is a teacher/co-teacher
  const { data: memberData } = await supabase
    .from('class_members')
    .select('role, status')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .in('role', ['teacher', 'co-teacher'])
    .eq('status', 'active')
    .single();

  if (memberData) {
    return { hasAccess: true, isOwner: false };
  }

  return { hasAccess: false };
}

// GET: List class members
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

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // teacher, student, all
    const status = searchParams.get('status') || 'active'; // active, invited, all

    const supabase = createSupabaseAdminClient();

    // Check teacher access (only teachers can see full member list)
    const access = await checkTeacherAccess(supabase, classId, userId);
    if (!access.hasAccess) {
      // Non-teachers can only see basic info
      const { data: members, error } = await supabase
        .from('class_members')
        .select('display_name, role')
        .eq('class_id', classId)
        .eq('status', 'active')
        .in('role', ['teacher', 'co-teacher']);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch members' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: members,
        limited: true
      });
    }

    // Build query for full member list
    let query = supabase
      .from('class_members')
      .select('*')
      .eq('class_id', classId);

    if (role && role !== 'all') {
      query = query.eq('role', role);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    query = query.order('role').order('joined_at', { ascending: false });

    const { data: members, error } = await query;

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      );
    }

    // Fetch user details for all members with user_id
    let enrichedMembers = members || [];
    if (members && members.length > 0) {
      const userIds = members
        .filter((m: any) => m.user_id)
        .map((m: any) => m.user_id);

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('user')
          .select('user_id, full_name, first_name, last_name, email, img_url')
          .in('user_id', userIds);

        // Map user data to members
        const userMap = new Map(users?.map((u: any) => [u.user_id, u]) || []);
        enrichedMembers = members.map((member: any) => {
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

    // Group by role
    const teachers = enrichedMembers.filter((m: any) => ['teacher', 'co-teacher'].includes(m.role)) || [];
    const students = enrichedMembers.filter((m: any) => m.role === 'student') || [];
    const pending = enrichedMembers.filter((m: any) => m.status === 'invited') || [];

    return NextResponse.json({
      success: true,
      data: {
        all: enrichedMembers,
        teachers,
        students,
        pending,
        counts: {
          total: enrichedMembers.length,
          teachers: teachers.length,
          students: students.length,
          pending: pending.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Add members (invite by email)
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
    const access = await checkTeacherAccess(supabase, classId, userId);
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Only teachers can add members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { emails, role = 'student' } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'At least one email is required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['student', 'co-teacher'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be student or co-teacher' },
        { status: 400 }
      );
    }

    // Get class info
    const { data: classData } = await supabase
      .from('classes')
      .select('auto_accept_students')
      .eq('class_id', classId)
      .single();

    const results = {
      added: [] as string[],
      existing: [] as string[],
      failed: [] as string[]
    };

    // Process each email
    for (const email of emails) {
      const normalizedEmail = email.trim().toLowerCase();

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        results.failed.push(normalizedEmail);
        continue;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('class_members')
        .select('member_id, status')
        .eq('class_id', classId)
        .eq('email', normalizedEmail)
        .single();

      if (existing) {
        results.existing.push(normalizedEmail);
        continue;
      }

      // Add the member
      const status = classData?.auto_accept_students ? 'active' : 'invited';

      const { error: insertError } = await supabase
        .from('class_members')
        .insert({
          class_id: classId,
          email: normalizedEmail,
          role,
          status,
          invited_by: userId,
          invitation_sent_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error adding member:', insertError);
        results.failed.push(normalizedEmail);
      } else {
        results.added.push(normalizedEmail);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Added ${results.added.length} members, ${results.existing.length} already exist, ${results.failed.length} failed`
    });

  } catch (error) {
    console.error('Error adding members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a member
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
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Get member info
    const { data: member } = await supabase
      .from('class_members')
      .select('user_id, role')
      .eq('member_id', memberId)
      .eq('class_id', classId)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Check if user is removing themselves
    if (member.user_id === userId) {
      // Users can remove themselves (leave class)
      const { error } = await supabase
        .from('class_members')
        .update({ status: 'removed' })
        .eq('member_id', memberId);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to leave class' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Left the class successfully'
      });
    }

    // Check teacher access for removing others
    const access = await checkTeacherAccess(supabase, classId, userId);
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Only teachers can remove members' },
        { status: 403 }
      );
    }

    // Cannot remove the class owner
    const { data: classData } = await supabase
      .from('classes')
      .select('created_by')
      .eq('class_id', classId)
      .single();

    if (member.user_id === classData?.created_by) {
      return NextResponse.json(
        { error: 'Cannot remove the class owner' },
        { status: 400 }
      );
    }

    // Remove the member (soft delete)
    const { error } = await supabase
      .from('class_members')
      .update({ status: 'removed' })
      .eq('member_id', memberId);

    if (error) {
      console.error('Error removing member:', error);
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update member (change role, accept invitation)
export async function PATCH(request: Request, { params }: RouteParams) {
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
    const { memberId, role, status } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check teacher access
    const access = await checkTeacherAccess(supabase, classId, userId);
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: 'Only teachers can update members' },
        { status: 403 }
      );
    }

    const updateData: any = {};

    if (role) {
      const validRoles = ['student', 'co-teacher'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role' },
          { status: 400 }
        );
      }
      updateData.role = role;
    }

    if (status) {
      const validStatuses = ['active', 'invited', 'removed'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateData.status = status;

      // Set joined_at when activating
      if (status === 'active') {
        updateData.joined_at = new Date().toISOString();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('class_members')
      .update(updateData)
      .eq('member_id', memberId)
      .eq('class_id', classId)
      .select()
      .single();

    if (error) {
      console.error('Error updating member:', error);
      return NextResponse.json(
        { error: 'Failed to update member' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
