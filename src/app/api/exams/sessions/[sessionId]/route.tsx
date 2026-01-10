import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const { userId } = await auth();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Fetch the session with exam data
    const { data: session, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Fetch the exam data
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', session.exam_id)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    let hasAccess = false;

    // Check if user is creator or collaborator of the exam
    if (userId) {
      hasAccess =
        exam.creator_id === userId ||
        exam.collaborator_ids?.includes(userId) ||
        session.created_by === userId;

      // Check if user's email is in allowed_emails
      if (!hasAccess) {
        const { data: userData } = await supabase
          .from('user')
          .select('email')
          .eq('user_id', userId)
          .single();

        if (userData?.email) {
          const userEmail = userData.email.toLowerCase();
          const allowedEmails = session.allowed_emails as string[] | null;
          hasAccess = allowedEmails?.some(
            (email: string) => email.toLowerCase() === userEmail
          ) || false;
        }
      }
    }

    // For unauthenticated users, deny access (they need to sign in first)
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required', requiresAuth: true },
        { status: 401 }
      );
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You are not authorized to access this exam session' },
        { status: 403 }
      );
    }

    // Check if session is active
    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'This exam session is no longer active' },
        { status: 403 }
      );
    }

    // Check date constraints
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
      session: {
        session_id: session.session_id,
        google_course_name: session.google_course_name,
        start_date: session.start_date,
        end_date: session.end_date,
        status: session.status
      },
      exam: {
        ...exam,
        // Use session dates instead of exam dates
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
