import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

interface ExamItem {
    question_id: string;
    question_type: string;
    points: number;
    required: boolean;
    correct_answer?: number | number[] | string | string[] | boolean;
    options?: string[];
}

interface Responses {
    [questionId: string]: any;
}

// Calculate score for auto-gradable questions
function calculateScore(items: ExamItem[], responses: Responses): { score: number; totalPoints: number } {
    let score = 0;
    let totalPoints = 0;

    for (const item of items) {
        // Skip non-question items
        if (item.question_type === 'section_header' || item.question_type === 'page_break') {
            continue;
        }

        totalPoints += item.points;
        const response = responses[item.question_id];

        // Skip if no response
        if (response === undefined || response === null || response === '') {
            continue;
        }

        // Check correctness based on question type
        switch (item.question_type) {
            case 'multiple_choice':
            case 'dropdown':
                if (item.correct_answer !== undefined && response === item.correct_answer) {
                    score += item.points;
                }
                break;

            case 'multiple_select':
                if (Array.isArray(item.correct_answer) && Array.isArray(response)) {
                    // Convert to strings for consistent comparison
                    const correctSet = new Set(item.correct_answer.map(String));
                    const responseSet = new Set(response.map(String));
                    if (correctSet.size === responseSet.size &&
                        [...correctSet].every(v => responseSet.has(v))) {
                        score += item.points;
                    }
                }
                break;

            case 'true_false':
                if (item.correct_answer !== undefined && response === item.correct_answer) {
                    score += item.points;
                }
                break;

            case 'short_answer':
                if (item.correct_answer !== undefined) {
                    const correctAnswers = Array.isArray(item.correct_answer)
                        ? item.correct_answer.map(a => String(a).toLowerCase().trim())
                        : [String(item.correct_answer).toLowerCase().trim()];

                    const responseStr = String(response).toLowerCase().trim();
                    if (correctAnswers.includes(responseStr)) {
                        score += item.points;
                    }
                }
                break;

            // These types require manual grading
            case 'long_answer':
            case 'file_upload':
            case 'coding':
                // Don't auto-grade, will need manual review
                break;

            // These types don't have correct answers
            case 'scale':
            case 'rating':
            case 'date':
            case 'time':
                // Just count as answered (full points for completion)
                score += item.points;
                break;
        }
    }

    return { score, totalPoints };
}

export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        const body = await request.json();
        const { attemptId, responses, timeSpent, autoSubmitted } = body;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        if (!attemptId) {
            return NextResponse.json(
                { success: false, error: 'Missing attempt ID' },
                { status: 400 }
            );
        }

        const supabase = await createSupabaseClient();

        // Get the attempt with exam data
        const { data: attempt, error: fetchError } = await supabase
            .from('exam_attempts')
            .select(`
                attempt_id,
                student_id,
                status,
                exam_id,
                start_time,
                exams (
                    exam_id,
                    items,
                    total_points,
                    passing_score,
                    show_results_immediately
                )
            `)
            .eq('attempt_id', attemptId)
            .single();

        if (fetchError || !attempt) {
            console.error('Error fetching attempt:', fetchError);
            return NextResponse.json(
                { success: false, error: 'Attempt not found' },
                { status: 404 }
            );
        }

        if (attempt.student_id !== userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        if (attempt.status !== 'in_progress') {
            return NextResponse.json(
                { success: false, error: 'This attempt has already been submitted' },
                { status: 400 }
            );
        }

        const exam = (attempt as any).exams;
        if (!exam) {
            return NextResponse.json(
                { success: false, error: 'Exam not found' },
                { status: 404 }
            );
        }

        // Calculate score
        const items = exam.items as ExamItem[];
        const { score, totalPoints } = calculateScore(items, responses || {});
        const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
        const passingScore = exam.passing_score || 0;
        const passed = percentage >= passingScore;

        // Determine if fully graded (no manual grading needed)
        const needsManualGrading = items.some(item =>
            ['long_answer', 'file_upload', 'coding'].includes(item.question_type) &&
            responses?.[item.question_id]
        );

        const status = needsManualGrading ? 'submitted' : 'graded';

        // Update the attempt
        const endTime = new Date().toISOString();
        const { error: updateError } = await supabase
            .from('exam_attempts')
            .update({
                responses: responses || {},
                status,
                end_time: endTime,
                submitted_at: endTime,
                time_spent_seconds: timeSpent || null,
                score,
                percentage: Math.round(percentage * 100) / 100,
                passed,
                graded_at: !needsManualGrading ? endTime : null,
                updated_at: endTime
            })
            .eq('attempt_id', attemptId);

        if (updateError) {
            console.error('Error submitting attempt:', updateError);
            return NextResponse.json(
                { success: false, error: 'Failed to submit exam' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: autoSubmitted ? 'Exam auto-submitted due to time limit' : 'Exam submitted successfully',
            score,
            totalPoints,
            percentage: Math.round(percentage * 100) / 100,
            passed,
            needsManualGrading,
            showResults: exam.show_results_immediately
        });

    } catch (error) {
        console.error('Error in submit attempt:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
