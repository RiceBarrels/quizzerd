import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function PUT(request: Request) {
    try {
        const { userId } = await auth();
        const body = await request.json();
        const { attemptId, responses } = body;

        const supabase = await createSupabaseClient();

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

        // Verify the attempt belongs to this user and is in progress
        const { data: attempt, error: fetchError } = await supabase
            .from('exam_attempts')
            .select('attempt_id, student_id, status')
            .eq('attempt_id', attemptId)
            .single();

        if (fetchError || !attempt) {
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

        // Update responses
        const { error: updateError } = await supabase
            .from('exam_attempts')
            .update({
                responses: responses || {},
                updated_at: new Date().toISOString()
            })
            .eq('attempt_id', attemptId);

        if (updateError) {
            console.error('Error saving responses:', updateError);
            return NextResponse.json(
                { success: false, error: 'Failed to save responses' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Responses saved successfully'
        });

    } catch (error) {
        console.error('Error in save responses:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
