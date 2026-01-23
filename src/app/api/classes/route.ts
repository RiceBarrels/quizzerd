import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// Generate a random class code (6 characters, alphanumeric)
function generateClassCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate unique class code with retry
async function getUniqueClassCode(supabase: any): Promise<string> {
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateClassCode();
    const { data } = await supabase
      .from('classes')
      .select('class_code')
      .eq('class_code', code)
      .single();

    if (!data) {
      return code;
    }
  }
  throw new Error('Could not generate unique class code');
}

// GET: List classes for the current user
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
    const filter = searchParams.get('filter') || 'all'; // all, teaching, enrolled
    const status = searchParams.get('status') || 'active'; // active, archived, all

    const supabase = createSupabaseAdminClient();

    // Use separate queries to avoid PostgREST .or() parsing issues with joins
    let teachingClasses: any[] = [];
    let enrolledClasses: any[] = [];

    // Fetch classes where user is creator (teaching)
    if (filter === 'all' || filter === 'teaching') {
      let ownerQuery = supabase
        .from('classes')
        .select(`
          *,
          member_count:class_members(count),
          exam_count:class_exams(count)
        `)
        .eq('created_by', userId);

      if (status !== 'all') {
        ownerQuery = ownerQuery.eq('status', status);
      }

      const { data: ownerClasses, error: ownerError } = await ownerQuery
        .order('created_at', { ascending: false });

      if (ownerError) {
        console.error('Error fetching owner classes:', ownerError);
      } else {
        teachingClasses = (ownerClasses || []).map((cls: any) => ({
          ...cls,
          user_role: 'owner',
          member_count: cls.member_count?.[0]?.count || 0,
          exam_count: cls.exam_count?.[0]?.count || 0
        }));
      }

      // Also fetch classes where user is a teacher/co-teacher (but not owner)
      const { data: teacherMemberships } = await supabase
        .from('class_members')
        .select('class_id, role')
        .eq('user_id', userId)
        .in('role', ['teacher', 'co-teacher'])
        .eq('status', 'active');

      if (teacherMemberships && teacherMemberships.length > 0) {
        const teacherClassIds = teacherMemberships
          .map((m: any) => m.class_id)
          .filter((id: string) => !teachingClasses.some((c: any) => c.class_id === id));

        if (teacherClassIds.length > 0) {
          let teacherQuery = supabase
            .from('classes')
            .select(`
              *,
              member_count:class_members(count),
              exam_count:class_exams(count)
            `)
            .in('class_id', teacherClassIds);

          if (status !== 'all') {
            teacherQuery = teacherQuery.eq('status', status);
          }

          const { data: teacherClasses } = await teacherQuery
            .order('created_at', { ascending: false });

          if (teacherClasses) {
            const membershipMap = new Map(teacherMemberships.map((m: any) => [m.class_id, m.role]));
            teachingClasses = [
              ...teachingClasses,
              ...teacherClasses.map((cls: any) => ({
                ...cls,
                user_role: membershipMap.get(cls.class_id) || 'teacher',
                member_count: cls.member_count?.[0]?.count || 0,
                exam_count: cls.exam_count?.[0]?.count || 0
              }))
            ];
          }
        }
      }
    }

    // Fetch classes where user is enrolled as student
    if (filter === 'all' || filter === 'enrolled') {
      const { data: studentMemberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', userId)
        .eq('role', 'student')
        .eq('status', 'active');

      if (studentMemberships && studentMemberships.length > 0) {
        const studentClassIds = studentMemberships.map((m: any) => m.class_id);

        let studentQuery = supabase
          .from('classes')
          .select(`
            *,
            member_count:class_members(count),
            exam_count:class_exams(count)
          `)
          .in('class_id', studentClassIds);

        if (status !== 'all') {
          studentQuery = studentQuery.eq('status', status);
        }

        const { data: studentClasses, error: studentError } = await studentQuery
          .order('created_at', { ascending: false });

        if (studentError) {
          console.error('Error fetching student classes:', studentError);
        } else {
          enrolledClasses = (studentClasses || []).map((cls: any) => ({
            ...cls,
            user_role: 'student',
            member_count: cls.member_count?.[0]?.count || 0,
            exam_count: cls.exam_count?.[0]?.count || 0
          }));
        }
      }
    }

    // Return appropriate data based on filter
    if (filter === 'teaching') {
      return NextResponse.json({
        success: true,
        data: teachingClasses
      });
    } else if (filter === 'enrolled') {
      return NextResponse.json({
        success: true,
        data: enrolledClasses
      });
    } else {
      // Return both teaching and enrolled separately for 'all' filter
      return NextResponse.json({
        success: true,
        data: {
          teaching: teachingClasses,
          enrolled: enrolledClasses,
          all: [...teachingClasses, ...enrolledClasses]
        }
      });
    }

  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a new class
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      class_name,
      class_description,
      banner_color = '#4285f4',
      banner_image,
      allow_join_by_code = true,
      auto_accept_students = true,
      google_course_id,
      google_course_name,
      google_sync_enabled = false
    } = body;

    // Validate required fields
    if (!class_name || class_name.trim() === '') {
      return NextResponse.json(
        { error: 'Class name is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Generate unique class code
    const class_code = await getUniqueClassCode(supabase);

    // Create the class
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .insert({
        class_name: class_name.trim(),
        class_description: class_description?.trim() || null,
        class_code,
        banner_color,
        banner_image: banner_image || null,
        allow_join_by_code,
        auto_accept_students,
        google_course_id: google_course_id || null,
        google_course_name: google_course_name || null,
        google_sync_enabled,
        status: 'active',
        created_by: userId
      })
      .select()
      .single();

    if (classError) {
      console.error('Error creating class:', classError);
      return NextResponse.json(
        { error: 'Failed to create class' },
        { status: 500 }
      );
    }

    // Add creator as teacher member
    const { error: memberError } = await supabase
      .from('class_members')
      .insert({
        class_id: classData.class_id,
        user_id: userId,
        email: userId, // Will be updated with actual email if available
        role: 'teacher',
        status: 'active',
        invited_by: userId
      });

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
      // Don't fail the request, class was created successfully
    }

    return NextResponse.json({
      success: true,
      data: {
        ...classData,
        user_role: 'owner',
        member_count: 1,
        exam_count: 0
      }
    });

  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
