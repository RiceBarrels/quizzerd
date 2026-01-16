import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { userId } = await auth();

    console.log('Session API called - sessionId:', sessionId, 'userId:', userId);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Fetch the session with exam data
    const { data: sessions, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('session_id', sessionId);

    console.log('Session lookup - count:', sessions?.length, 'sessions:', sessions, 'error:', sessionError?.message);

    const session = sessions?.[0];

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found', details: sessionError?.message },
        { status: 404 }
      );
    }

    // Fetch the exam data
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', session.exam_id)
      .single();

    console.log('Exam lookup - examId:', session.exam_id, 'found:', !!exam, 'error:', examError?.message);

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found', examId: session.exam_id, details: examError?.message },
        { status: 404 }
      );
    }

    // For unauthenticated users, deny access (they need to sign in first)
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', requiresAuth: true },
        { status: 401 }
      );
    }

    // Check access permissions
    let hasAccess = false;
    let isTeacher = false;

    // Check if user is creator or collaborator of the exam
    isTeacher =
      exam.created_by === userId ||
      exam.collaborator_ids?.includes(userId) ||
      session.created_by === userId;

    if (isTeacher) {
      hasAccess = true;
    }

    console.log('Access check - userId:', userId, 'exam.created_by:', exam.created_by, 'session.created_by:', session.created_by, 'isTeacher:', isTeacher);

    // Check if user's email is in allowed_emails (for students)
    if (!hasAccess) {
      // Get user email directly from Clerk
      const user = await currentUser();
      const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();

      console.log('User lookup from Clerk - userId:', userId, 'userEmail:', userEmail);

      if (userEmail) {
        // Handle both string (JSON) and array formats
        let allowedEmails: string[] = [];
        if (typeof session.allowed_emails === 'string') {
          try {
            allowedEmails = JSON.parse(session.allowed_emails);
          } catch {
            allowedEmails = [];
          }
        } else if (Array.isArray(session.allowed_emails)) {
          allowedEmails = session.allowed_emails;
        }

        console.log('Email check - userEmail:', userEmail, 'allowedEmails:', allowedEmails);

        hasAccess = allowedEmails.some(
          (email: string) => email.toLowerCase() === userEmail
        );
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You are not authorized to access this exam session' },
        { status: 403 }
      );
    }

    // For teachers, return dashboard data with attempts and violations
    if (isTeacher) {
      // Fetch all attempts for this session
      const { data: attempts, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('session_id', sessionId)
        .order('start_time', { ascending: false });

      // Fetch user info from the user table for each student
      const studentIds = [...new Set(attempts?.map(a => a.student_id) || [])];
      let userMap: Record<string, { email: string; name: string; img_url: string | null }> = {};

      if (studentIds.length > 0) {
        const { data: users } = await supabase
          .from('user')
          .select('user_id, email, full_name, first_name, last_name, img_url')
          .in('user_id', studentIds);

        if (users) {
          userMap = users.reduce((acc, user) => {
            acc[user.user_id] = {
              email: user.email,
              name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || null,
              img_url: user.img_url
            };
            return acc;
          }, {} as Record<string, { email: string; name: string; img_url: string | null }>);
        }
      }

      // Attach user info to attempts
      const attemptsWithUsers = (attempts || []).map(attempt => ({
        ...attempt,
        user: userMap[attempt.student_id] || { email: attempt.student_id, name: null, img_url: null }
      }));

      // Fetch all violations for this session's attempts
      const attemptIds = attempts?.map(a => a.attempt_id) || [];
      let violations: any[] = [];
      if (attemptIds.length > 0) {
        const { data: violationsData } = await supabase
          .from('exam_violations')
          .select('*')
          .in('attempt_id', attemptIds)
          .order('timestamp', { ascending: false });
        violations = violationsData || [];
      }

      return NextResponse.json({
        success: true,
        isTeacher: true,
        session: {
          session_id: session.session_id,
          google_course_name: session.google_course_name,
          start_date: session.start_date,
          end_date: session.end_date,
          status: session.status,
          allowed_emails: session.allowed_emails
        },
        exam: {
          ...exam,
          start_date: session.start_date,
          end_date: session.end_date
        },
        attempts: attemptsWithUsers,
        violations: violations
      });
    }

    // For students, check session status and dates
    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'This exam session is no longer active' },
        { status: 403 }
      );
    }

    const now = new Date();
    if (session.start_date && new Date(session.start_date) > now) {
      return NextResponse.json(
        { error: 'This exam has not started yet', startDate: session.start_date },
        { status: 403 }
      );
    }

    if (session.end_date && new Date(session.end_date) < now) {
      return NextResponse.json(
        { error: 'This exam has ended', endDate: session.end_date },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      isTeacher: false,
      session: {
        session_id: session.session_id,
        google_course_name: session.google_course_name,
        start_date: session.start_date,
        end_date: session.end_date,
        status: session.status
      },
      exam: {
        ...exam,
        start_date: session.start_date,
        end_date: session.end_date
      }
    });

  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
