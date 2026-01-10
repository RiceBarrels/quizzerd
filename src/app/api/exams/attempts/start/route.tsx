import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
    try {
        const { userId: authUserId } = await auth();
        const body = await request.json();
        const { examId, userId } = body;

        const supabase = await createSupabaseClient();

        // Verify user is authenticated
        if (!authUserId || authUserId !== userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!examId || !userId) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Get exam details including allowed_emails for whitelist check
        const { data: exam, error: examError } = await supabase
            .from('exams')
            .select('exam_id, exam_name, is_published, attempts_allowed, start_date, end_date, allowed_emails, is_public')
            .eq('exam_id', examId)
            .single();

        if (examError || !exam) {
            return NextResponse.json(
                { success: false, error: 'Exam not found' },
                { status: 404 }
            );
        }

        // Check if exam is published
        if (!exam.is_published) {
            return NextResponse.json(
                { success: false, error: 'This exam is not available' },
                { status: 403 }
            );
        }

        // Check email whitelist if allowed_emails is set
        const allowedEmails = exam.allowed_emails as string[] | null;
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
        if (exam.start_date && new Date(exam.start_date) > now) {
            return NextResponse.json(
                { success: false, error: 'This exam has not started yet' },
                { status: 403 }
            );
        }

        if (exam.end_date && new Date(exam.end_date) < now) {
            return NextResponse.json(
                { success: false, error: 'This exam has ended' },
                { status: 403 }
            );
        }

        // Check existing attempts
        const { data: existingAttempts, error: attemptsError } = await supabase
            .from('exam_attempts')
            .select('attempt_id, status, attempt_number')
            .eq('exam_id', examId)
            .eq('student_id', userId)
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

        const { data: newAttempt, error: createError } = await supabase
            .from('exam_attempts')
            .insert({
                exam_id: examId,
                student_id: userId,
                attempt_number: attemptNumber,
                status: 'in_progress',
                start_time: new Date().toISOString(),
                responses: {}
            })
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
