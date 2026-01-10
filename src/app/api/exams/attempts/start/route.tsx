import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
    try {
        const { userId: authUserId } = await auth();
        const body = await request.json();
        const { examId, userId, sessionId } = body;

        const supabase = await createSupabaseClient();

        // Verify user is authenticated
        if (!authUserId || authUserId !== userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Must have either examId or sessionId
        if (!examId && !sessionId) {
            return NextResponse.json(
                { success: false, error: 'Either examId or sessionId is required' },
                { status: 400 }
            );
        }

        let exam: any;
        let session: any = null;
        let allowedEmails: string[] | null = null;
        let startDate: string | null = null;
        let endDate: string | null = null;

        // If sessionId is provided, get session and exam from session
        if (sessionId) {
            const { data: sessionData, error: sessionError } = await supabase
                .from('exam_sessions')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (sessionError || !sessionData) {
                return NextResponse.json(
                    { success: false, error: 'Session not found' },
                    { status: 404 }
                );
            }

            session = sessionData;
            allowedEmails = session.allowed_emails as string[] | null;
            startDate = session.start_date;
            endDate = session.end_date;

            // Check session status
            if (session.status !== 'active') {
                return NextResponse.json(
                    { success: false, error: 'This exam session is no longer active' },
                    { status: 403 }
                );
            }

            // Get exam from session
            const { data: examData, error: examError } = await supabase
                .from('exams')
                .select('exam_id, exam_name, is_published, attempts_allowed')
                .eq('exam_id', session.exam_id)
                .single();

            if (examError || !examData) {
                return NextResponse.json(
                    { success: false, error: 'Exam not found' },
                    { status: 404 }
                );
            }

            exam = examData;
        } else {
            // Get exam directly by examId (for backwards compatibility)
            const { data: examData, error: examError } = await supabase
                .from('exams')
                .select('exam_id, exam_name, is_published, attempts_allowed, start_date, end_date, allowed_emails, is_public')
                .eq('exam_id', examId)
                .single();

            if (examError || !examData) {
                return NextResponse.json(
                    { success: false, error: 'Exam not found' },
                    { status: 404 }
                );
            }

            exam = examData;
            allowedEmails = exam.allowed_emails as string[] | null;
            startDate = exam.start_date;
            endDate = exam.end_date;
        }

        // Check if exam is published
        if (!exam.is_published) {
            return NextResponse.json(
                { success: false, error: 'This exam is not available' },
                { status: 403 }
            );
        }

        // Check email whitelist if allowed_emails is set
        if (allowedEmails && allowedEmails.length > 0) {
            // Get user's email from the user table
            const { data: userData, error: userError } = await supabase
                .from('user')
                .select('email')
                .eq('user_id', userId)
                .single();

            if (userError || !userData?.email) {
                return NextResponse.json(
                    { success: false, error: 'Could not verify your email address. Please update your profile.' },
                    { status: 403 }
                );
            }

            const userEmail = userData.email.toLowerCase();
            const isAllowed = allowedEmails.some(
                (email: string) => email.toLowerCase() === userEmail
            );

            if (!isAllowed) {
                return NextResponse.json(
                    { success: false, error: 'You are not authorized to take this exam. Please contact your instructor.' },
                    { status: 403 }
                );
            }
        }

        // Check date constraints
        const now = new Date();
        if (startDate && new Date(startDate) > now) {
            return NextResponse.json(
                { success: false, error: 'This exam has not started yet' },
                { status: 403 }
            );
        }

        if (endDate && new Date(endDate) < now) {
            return NextResponse.json(
                { success: false, error: 'This exam has ended' },
                { status: 403 }
            );
        }

        // Check existing attempts for this exam (and session if provided)
        let attemptsQuery = supabase
            .from('exam_attempts')
            .select('attempt_id, status, attempt_number')
            .eq('exam_id', exam.exam_id)
            .eq('student_id', userId);

        // If using session, filter by session_id for attempt tracking
        if (sessionId) {
            attemptsQuery = attemptsQuery.eq('session_id', sessionId);
        }

        const { data: existingAttempts, error: attemptsError } = await attemptsQuery
            .order('attempt_number', { ascending: false });

        if (attemptsError) {
            console.error('Error fetching attempts:', attemptsError);
            return NextResponse.json(
                { success: false, error: 'Failed to check existing attempts' },
                { status: 500 }
            );
        }

        // Check for in-progress attempt
        const inProgressAttempt = existingAttempts?.find(a => a.status === 'in_progress');
        if (inProgressAttempt) {
            // Return the existing in-progress attempt
            return NextResponse.json({
                success: true,
                attemptId: inProgressAttempt.attempt_id,
                isResuming: true,
                message: 'Resuming existing attempt'
            });
        }

        // Check attempt limit
        const completedAttempts = existingAttempts?.filter(a => a.status === 'submitted' || a.status === 'graded').length || 0;
        if (exam.attempts_allowed && completedAttempts >= exam.attempts_allowed) {
            return NextResponse.json(
                { success: false, error: `You have used all ${exam.attempts_allowed} attempts for this exam` },
                { status: 403 }
            );
        }

        // Create new attempt
        const attemptNumber = (existingAttempts?.[0]?.attempt_number || 0) + 1;

        const attemptData: any = {
            exam_id: exam.exam_id,
            student_id: userId,
            attempt_number: attemptNumber,
            status: 'in_progress',
            start_time: new Date().toISOString(),
            responses: {}
        };

        // Add session_id if using session-based access
        if (sessionId) {
            attemptData.session_id = sessionId;
        }

        const { data: newAttempt, error: createError } = await supabase
            .from('exam_attempts')
            .insert(attemptData)
            .select('attempt_id')
            .single();

        if (createError) {
            console.error('Error creating attempt:', createError);
            return NextResponse.json(
                { success: false, error: 'Failed to start exam' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            attemptId: newAttempt.attempt_id,
            attemptNumber,
            isResuming: false,
            message: 'Exam started successfully'
        });

    } catch (error) {
        console.error('Error in start attempt:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
