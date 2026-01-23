import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';

/**
 * Lookup class by legacy session ID
 * Used for redirecting old session URLs to new class URLs
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Look up class by legacy_session_ids array
    const { data: classes, error } = await supabase
      .from('classes')
      .select('class_id, class_name')
      .contains('legacy_session_ids', [sessionId]);

    if (error) {
      console.error('Error looking up class:', error);
      return NextResponse.json(
        { error: 'Failed to lookup class' },
        { status: 500 }
      );
    }

    if (!classes || classes.length === 0) {
      // Try to look up directly from exam_sessions table
      // and find the associated class via class_exams
      const { data: session } = await supabase
        .from('exam_sessions')
        .select('exam_id, google_course_id, created_by')
        .eq('session_id', sessionId)
        .single();

      if (session && session.google_course_id) {
        // Find class by google_course_id and created_by
        const { data: classMatch } = await supabase
          .from('classes')
          .select('class_id, class_name')
          .eq('google_course_id', session.google_course_id)
          .eq('created_by', session.created_by)
          .single();

        if (classMatch) {
          return NextResponse.json({
            success: true,
            data: {
              class_id: classMatch.class_id,
              class_name: classMatch.class_name
            }
          });
        }
      }

      return NextResponse.json(
        { error: 'No class found for this session' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        class_id: classes[0].class_id,
        class_name: classes[0].class_name
      }
    });

  } catch (error) {
    console.error('Error looking up class by session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
