import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { auth, currentUser } from '@clerk/nextjs/server';

// GET - Get active users editing an exam
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
    const examId = searchParams.get('examId');

    if (!examId) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Clean up stale presence records (older than 5 minutes)
    await supabase
      .from('exam_presence')
      .delete()
      .lt('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    // Get active presence for this exam
    const { data: presence, error } = await supabase
      .from('exam_presence')
      .select('*')
      .eq('exam_id', examId)
      .gt('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('last_seen', { ascending: false });

    if (error) {
      console.error('Error fetching presence:', error);
      return NextResponse.json(
        { error: 'Failed to fetch presence' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: presence || []
    });

  } catch (error) {
    console.error('Error fetching presence:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Update user presence (heartbeat)
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { examId, currentQuestionId, cursorPosition } = body;

    if (!examId) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check if user has access to this exam
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('creator_id, collaborator_ids')
      .eq('exam_id', examId)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    const isOwner = exam.creator_id === userId;
    const isCollaborator = exam.collaborator_ids?.includes(userId);

    if (!isOwner && !isCollaborator) {
      return NextResponse.json(
        { error: 'You do not have access to this exam' },
        { status: 403 }
      );
    }

    // Upsert presence record
    const presenceData = {
      exam_id: examId,
      user_id: userId,
      user_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown',
      user_email: user.emailAddresses?.[0]?.emailAddress || '',
      user_avatar: user.imageUrl || null,
      current_question_id: currentQuestionId || null,
      cursor_position: cursorPosition || null,
      last_seen: new Date().toISOString()
    };

    const { data: presence, error } = await supabase
      .from('exam_presence')
      .upsert(presenceData, {
        onConflict: 'exam_id,user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating presence:', error);
      return NextResponse.json(
        { error: 'Failed to update presence' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: presence
    });

  } catch (error) {
    console.error('Error updating presence:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove user presence (when leaving editor)
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');

    if (!examId) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { error } = await supabase
      .from('exam_presence')
      .delete()
      .eq('exam_id', examId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing presence:', error);
      return NextResponse.json(
        { error: 'Failed to remove presence' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Presence removed successfully'
    });

  } catch (error) {
    console.error('Error removing presence:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
