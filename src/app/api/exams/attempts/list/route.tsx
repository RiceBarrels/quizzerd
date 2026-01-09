import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
    try {
        const { userId } = await auth();
        const { searchParams } = new URL(request.url);
        const examId = searchParams.get('examId');

        const supabase = await createSupabaseClient();

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!examId) {
            return NextResponse.json(
                { success: false, error: 'Missing exam ID' },
                { status: 400 }
            );
        }

        // Verify user is the exam creator
        const { data: exam, error: examError } = await supabase
            .from('exams')
            .select('exam_id, creator_id')
            .eq('exam_id', examId)
            .single();

        if (examError || !exam) {
            return NextResponse.json(
                { success: false, error: 'Exam not found' },
                { status: 404 }
            );
        }

        if (exam.creator_id !== userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized - only exam creator can view attempts' },
                { status: 403 }
            );
        }

        // Get all attempts for this exam
        const { data: attempts, error: attemptsError } = await supabase
            .from('exam_attempts')
            .select(`
                attempt_id,
                student_id,
                attempt_number,
                status,
                start_time,
                end_time,
                submitted_at,
                time_spent_seconds,
                score,
                percentage,
                passed,
                responses,
                graded_at,
                created_at
            `)
            .eq('exam_id', examId)
            .order('created_at', { ascending: false });

        if (attemptsError) {
            console.error('Error fetching attempts:', attemptsError);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch attempts' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            attempts: attempts || []
        });

    } catch (error) {
        console.error('Error in list attempts:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
