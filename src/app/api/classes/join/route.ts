import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { auth, currentUser } from '@clerk/nextjs/server';

// POST: Join a class by code
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user email from Clerk
    const user = await currentUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { class_code } = body;

    if (!class_code || class_code.trim() === '') {
      return NextResponse.json(
        { error: 'Class code is required' },
        { status: 400 }
      );
    }

    const normalizedCode = class_code.trim().toLowerCase();

    const supabase = createSupabaseAdminClient();

    // Find the class by code
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('class_code', normalizedCode)
      .single();

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found. Please check the code and try again.' },
        { status: 404 }
      );
    }

    // Check if class is archived
    if (classData.status === 'archived') {
      return NextResponse.json(
        { error: 'This class is archived and no longer accepting new members.' },
        { status: 400 }
      );
    }

    // Check if joining by code is allowed
    if (!classData.allow_join_by_code) {
      return NextResponse.json(
        { error: 'This class does not accept joining by code. Please ask the teacher to invite you.' },
        { status: 400 }
      );
    }

    // Check if user is the creator
    if (classData.created_by === userId) {
      return NextResponse.json(
        { error: 'You are the owner of this class.' },
        { status: 400 }
      );
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('class_members')
      .select('*')
      .eq('class_id', classData.class_id)
      .or(`user_id.eq.${userId},email.eq.${userEmail}`)
      .single();

    if (existingMember) {
      if (existingMember.status === 'active') {
        return NextResponse.json(
          { error: 'You are already a member of this class.' },
          { status: 400 }
        );
      } else if (existingMember.status === 'removed') {
        return NextResponse.json(
          { error: 'You have been removed from this class. Please contact the teacher.' },
          { status: 400 }
        );
      } else if (existingMember.status === 'invited') {
        // Activate the invitation
        const { error: updateError } = await supabase
          .from('class_members')
          .update({
            user_id: userId,
            status: 'active',
            joined_at: new Date().toISOString()
          })
          .eq('member_id', existingMember.member_id);

        if (updateError) {
          console.error('Error activating membership:', updateError);
          return NextResponse.json(
            { error: 'Failed to join class' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Successfully joined the class!',
          data: {
            class_id: classData.class_id,
            class_name: classData.class_name,
            role: existingMember.role
          }
        });
      }
    }

    // Determine status based on auto_accept setting
    const memberStatus = classData.auto_accept_students ? 'active' : 'invited';

    // Add user as a student
    const { data: newMember, error: memberError } = await supabase
      .from('class_members')
      .insert({
        class_id: classData.class_id,
        user_id: userId,
        email: userEmail,
        display_name: user?.firstName && user?.lastName
          ? `${user.firstName} ${user.lastName}`
          : user?.firstName || userEmail,
        role: 'student',
        status: memberStatus,
        joined_at: memberStatus === 'active' ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error joining class:', memberError);
      return NextResponse.json(
        { error: 'Failed to join class' },
        { status: 500 }
      );
    }

    const message = memberStatus === 'active'
      ? 'Successfully joined the class!'
      : 'Join request sent. Please wait for the teacher to approve.';

    return NextResponse.json({
      success: true,
      message,
      data: {
        class_id: classData.class_id,
        class_name: classData.class_name,
        class_description: classData.class_description,
        banner_color: classData.banner_color,
        role: 'student',
        status: memberStatus
      }
    });

  } catch (error) {
    console.error('Error joining class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Preview class by code (without joining)
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Class code is required' },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toLowerCase();

    const supabase = createSupabaseAdminClient();

    // Find the class by code
    const { data: classData, error } = await supabase
      .from('classes')
      .select(`
        class_id,
        class_name,
        class_description,
        banner_color,
        banner_image,
        status,
        allow_join_by_code,
        created_by
      `)
      .eq('class_code', normalizedCode)
      .single();

    if (error || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('class_members')
      .select('role, status')
      .eq('class_id', classData.class_id)
      .eq('user_id', userId)
      .single();

    // Get member count
    const { count } = await supabase
      .from('class_members')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classData.class_id)
      .eq('status', 'active');

    return NextResponse.json({
      success: true,
      data: {
        class_id: classData.class_id,
        class_name: classData.class_name,
        class_description: classData.class_description,
        banner_color: classData.banner_color,
        banner_image: classData.banner_image,
        member_count: count || 0,
        status: classData.status,
        allow_join_by_code: classData.allow_join_by_code,
        is_owner: classData.created_by === userId,
        is_member: !!existingMember,
        member_status: existingMember?.status || null,
        member_role: existingMember?.role || null
      }
    });

  } catch (error) {
    console.error('Error previewing class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
