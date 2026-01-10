import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { googleApiFetch } from '@/lib/google-auth';
import { sendEmail } from '@/lib/resend';
import { generateExamInvitationHtml } from '@/components/emails/exam-invitation';

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
    const { exam_id, course_id, scheduled_time, due_date } = body;
    let { accessToken, expiresAt } = body;

    if (!exam_id) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    if (!course_id) {
      return NextResponse.json(
        { error: 'Google Classroom course ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Fetch the exam data
    const { data: examData, error: fetchError } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', exam_id)
      .single();

    if (fetchError || !examData) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to publish
    const hasPermission =
      examData.creator_id === userId ||
      examData.collaborator_ids?.includes(userId);

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to publish this exam' },
        { status: 403 }
      );
    }

    // Get Google OAuth token if not provided
    if (!accessToken) {
      try {
        const tokenResponse = await fetch(new URL('/api/auth/google-token', request.url).href, {
          headers: {
            cookie: request.headers.get('cookie') || '',
          },
        });
        const tokenData = await tokenResponse.json();

        if (tokenData.success && tokenData.accessToken) {
          accessToken = tokenData.accessToken;
          expiresAt = tokenData.expiresAt;
        }
      } catch (error) {
        console.error('Error getting token from Clerk:', error);
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Google authentication required',
          message: 'Please connect your Google account to publish to Google Classroom'
        },
        { status: 401 }
      );
    }

    // We'll update the exam URL after creating the session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quizzerd.com';

    // Create coursework in Google Classroom (we'll update the link after creating session)
    const courseworkData: any = {
      title: examData.exam_name,
      description: `${examData.exam_description || ''}\n\nTake the exam on QuizZerd`,
      workType: 'ASSIGNMENT',
      state: scheduled_time ? 'DRAFT' : 'PUBLISHED',
      maxPoints: examData.total_points || 100
    };

    // Add due date if provided
    if (due_date) {
      const dueDateTime = new Date(due_date);
      courseworkData.dueDate = {
        year: dueDateTime.getFullYear(),
        month: dueDateTime.getMonth() + 1,
        day: dueDateTime.getDate()
      };
      courseworkData.dueTime = {
        hours: dueDateTime.getHours(),
        minutes: dueDateTime.getMinutes()
      };
    }

    // Add scheduled publish time if provided
    if (scheduled_time) {
      const scheduleDateTime = new Date(scheduled_time);
      courseworkData.scheduledTime = scheduleDateTime.toISOString();
    }

    // Create the assignment in Google Classroom
    const classroomResponse = await googleApiFetch(
      `https://classroom.googleapis.com/v1/courses/${course_id}/courseWork`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseworkData),
      },
      userId,
      accessToken,
      expiresAt
    );

    if (!classroomResponse.ok) {
      const errorText = await classroomResponse.text();
      console.error('Google Classroom API error:', errorText);

      if (classroomResponse.status === 403) {
        return NextResponse.json(
          {
            error: 'Permission denied',
            message: 'You do not have permission to post to this Google Classroom course. Make sure you are a teacher in the course.'
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to publish to Google Classroom',
          message: errorText
        },
        { status: classroomResponse.status }
      );
    }

    const classroomData = await classroomResponse.json();

    // Fetch students from Google Classroom to whitelist their emails
    let allowedEmails: string[] = [];
    let courseName = 'Your Course';

    try {
      // Get the course details to get the course name
      const courseResponse = await googleApiFetch(
        `https://classroom.googleapis.com/v1/courses/${course_id}`,
        {},
        userId,
        accessToken,
        expiresAt
      );

      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        courseName = courseData.name || 'Your Course';
      }

      // Fetch students from Google Classroom
      const studentsResponse = await googleApiFetch(
        `https://classroom.googleapis.com/v1/courses/${course_id}/students`,
        {},
        userId,
        accessToken,
        expiresAt
      );

      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        const classroomStudents = studentsData.students || [];

        // Extract and store all student emails for whitelisting
        allowedEmails = classroomStudents
          .map((s: any) => s.profile?.emailAddress?.toLowerCase())
          .filter(Boolean);
      }
    } catch (fetchError) {
      console.error('Error fetching students for whitelist:', fetchError);
      // Continue without whitelist - exam will be accessible to anyone
    }

    // Create a session for this Google Classroom publishing
    const { data: sessionData, error: sessionError } = await supabase
      .from('exam_sessions')
      .insert({
        exam_id: exam_id,
        google_course_id: course_id,
        google_course_name: courseName,
        google_classroom_id: classroomData.id,
        allowed_emails: allowedEmails,
        start_date: scheduled_time || new Date().toISOString(),
        end_date: due_date || null,
        status: 'active',
        created_by: userId
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return NextResponse.json(
        { error: 'Failed to create exam session', details: sessionError.message },
        { status: 500 }
      );
    }

    // Update the exam status to published (if not already)
    const { data, error } = await supabase
      .from('exams')
      .update({
        status: 'published',
        is_published: true,
        updated_at: new Date().toISOString()
      })
      .eq('exam_id', exam_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating exam status:', error);
      // Continue - session was created successfully
    }

    // Build the session URL for students
    const sessionUrl = `${baseUrl}/exam/session/${sessionData.session_id}`;

    // Send invitation emails to unregistered students
    let invitationResults = { sent: 0, failed: 0, skipped: 0, whitelisted: allowedEmails.length };
    try {
      if (allowedEmails.length > 0) {
        // Check which students are NOT in our database
        const { data: existingUsers } = await supabase
          .from('user')
          .select('email')
          .in('email', allowedEmails);

        const existingEmails = new Set(
          (existingUsers || []).map((u: any) => u.email?.toLowerCase())
        );

        // Get unregistered emails
        const unregisteredEmails = allowedEmails.filter(
          (email: string) => !existingEmails.has(email)
        );

        if (unregisteredEmails.length > 0) {
          // Get teacher name from user table
          const { data: teacherData } = await supabase
            .from('user')
            .select('full_name, first_name, last_name')
            .eq('user_id', userId)
            .single();

          const teacherName = teacherData?.full_name ||
            `${teacherData?.first_name || ''} ${teacherData?.last_name || ''}`.trim() ||
            'Your Instructor';

          // Send invitation emails to unregistered students using session URL
          const emailPromises = unregisteredEmails.map(async (email: string) => {
            try {
              const result = await sendEmail({
                to: email,
                subject: `New Exam: ${examData.exam_name} - ${courseName}`,
                html: generateExamInvitationHtml({
                  examName: examData.exam_name,
                  courseName,
                  teacherName,
                  examUrl: sessionUrl,
                  dueDate: due_date ? new Date(due_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : undefined,
                  description: examData.exam_description || undefined,
                }),
              });

              return result.success ? 'sent' : 'failed';
            } catch (err) {
              console.error(`Failed to send email to ${email}:`, err);
              return 'failed';
            }
          });

          const results = await Promise.all(emailPromises);
          invitationResults.sent = results.filter(r => r === 'sent').length;
          invitationResults.failed = results.filter(r => r === 'failed').length;
          invitationResults.skipped = existingEmails.size;
        } else {
          invitationResults.skipped = existingEmails.size;
        }
      }
    } catch (inviteError) {
      console.error('Error sending invitation emails:', inviteError);
      // Don't fail the whole request if email sending fails
    }

    return NextResponse.json({
      success: true,
      data: data || examData,
      session: {
        id: sessionData.session_id,
        url: sessionUrl,
        courseName: courseName,
        allowedEmails: allowedEmails.length
      },
      classroom: {
        id: classroomData.id,
        alternateLink: classroomData.alternateLink,
        courseId: course_id
      },
      invitations: invitationResults,
      message: 'Exam published to Google Classroom successfully'
    });

  } catch (error) {
    console.error('Error publishing to Google Classroom:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

// GET endpoint to list available Google Classroom courses
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get access token from Clerk
    let accessToken = null;
    let expiresAt = null;

    try {
      const tokenResponse = await fetch(new URL('/api/auth/google-token', request.url).href, {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      });
      const tokenData = await tokenResponse.json();

      if (tokenData.success && tokenData.accessToken) {
        accessToken = tokenData.accessToken;
        expiresAt = tokenData.expiresAt;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        courses: [],
        message: 'Google account not connected'
      });
    }

    // Fetch courses where user is a teacher
    const coursesResponse = await googleApiFetch(
      'https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE',
      {},
      userId,
      accessToken,
      expiresAt
    );

    if (!coursesResponse.ok) {
      const errorText = await coursesResponse.text();
      console.error('Error fetching courses:', errorText);
      return NextResponse.json({
        success: false,
        courses: [],
        message: 'Failed to fetch Google Classroom courses'
      });
    }

    const coursesData = await coursesResponse.json();

    return NextResponse.json({
      success: true,
      courses: coursesData.courses || [],
      message: 'Courses fetched successfully'
    });

  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
