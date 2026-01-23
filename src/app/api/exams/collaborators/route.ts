import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';

// Helper to check if string is an email
function isEmail(str: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}

// Helper to get user ID from email using Clerk
async function getUserIdFromEmail(email: string): Promise<string | null> {
  if (!process.env.CLERK_SECRET_KEY) {
    console.error('CLERK_SECRET_KEY is not set');
    return null;
  }

  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  try {
    const users = await clerkClient.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });

    if (users.data && users.data.length > 0) {
      return users.data[0].id;
    }

    return null;
  } catch (error) {
    console.error('Error looking up user by email:', error);
    return null;
  }
}

// Helper to get user info from Clerk
async function getUserInfo(userId: string): Promise<{ email: string; name: string } | null> {
  if (!process.env.CLERK_SECRET_KEY) {
    return null;
  }

  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  try {
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses?.[0]?.emailAddress || '';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || '';
    return { email, name };
  } catch (error) {
    console.error('Error getting user info:', error);
    return null;
  }
}

// GET - List collaborators for an exam (with user info)
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

    // Get exam with collaborator_ids
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

    // Check if user is creator or existing collaborator
    const isOwner = exam.creator_id === userId;
    const collaboratorIds = exam.collaborator_ids || [];
    const isCollaborator = collaboratorIds.includes(userId);

    if (!isOwner && !isCollaborator) {
      return NextResponse.json(
        { error: 'You do not have access to this exam' },
        { status: 403 }
      );
    }

    // Fetch user info for each collaborator
    const collaborators = await Promise.all(
      collaboratorIds.map(async (id: string) => {
        const userInfo = await getUserInfo(id);
        return {
          id,
          email: userInfo?.email || '',
          name: userInfo?.name || '',
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        collaborators,
        collaboratorIds,
        isOwner
      }
    });

  } catch (error) {
    console.error('Error fetching collaborators:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a collaborator to an exam (by user ID or email)
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
    const { examId, collaboratorIdOrEmail } = body;

    if (!examId || !collaboratorIdOrEmail) {
      return NextResponse.json(
        { error: 'Exam ID and collaborator ID or email are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check if user is the exam owner
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

    if (exam.creator_id !== userId) {
      return NextResponse.json(
        { error: 'Only the exam owner can add collaborators' },
        { status: 403 }
      );
    }

    // Determine if input is email or user ID
    let collaboratorId = collaboratorIdOrEmail.trim();
    let userEmail = '';

    if (isEmail(collaboratorIdOrEmail)) {
      // Look up user by email
      userEmail = collaboratorIdOrEmail.toLowerCase();
      const foundUserId = await getUserIdFromEmail(userEmail);

      if (!foundUserId) {
        return NextResponse.json(
          { error: 'No user found with this email address. They must sign up first.' },
          { status: 404 }
        );
      }

      collaboratorId = foundUserId;
    } else {
      // Get email for the user ID
      const userInfo = await getUserInfo(collaboratorId);
      userEmail = userInfo?.email || '';
    }

    // Check if already a collaborator
    const currentCollaborators = exam.collaborator_ids || [];
    if (currentCollaborators.includes(collaboratorId)) {
      return NextResponse.json(
        { error: 'User is already a collaborator' },
        { status: 409 }
      );
    }

    // Check if trying to add self
    if (collaboratorId === userId) {
      return NextResponse.json(
        { error: 'You cannot add yourself as a collaborator' },
        { status: 400 }
      );
    }

    // Add collaborator
    const updatedCollaborators = [...currentCollaborators, collaboratorId];

    const { error: updateError } = await supabase
      .from('exams')
      .update({ collaborator_ids: updatedCollaborators })
      .eq('exam_id', examId);

    if (updateError) {
      console.error('Error adding collaborator:', updateError);
      return NextResponse.json(
        { error: 'Failed to add collaborator' },
        { status: 500 }
      );
    }

    // Get user info for response
    const userInfo = await getUserInfo(collaboratorId);

    return NextResponse.json({
      success: true,
      data: {
        collaboratorId,
        email: userInfo?.email || userEmail,
        name: userInfo?.name || '',
        collaboratorIds: updatedCollaborators
      },
      message: 'Collaborator added successfully'
    });

  } catch (error) {
    console.error('Error adding collaborator:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a collaborator from an exam
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
    const collaboratorId = searchParams.get('collaboratorId');

    if (!examId || !collaboratorId) {
      return NextResponse.json(
        { error: 'Exam ID and collaborator ID are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Get exam
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

    // Check permissions - owner can remove anyone, users can remove themselves
    const isOwner = exam.creator_id === userId;
    const isSelfRemoval = collaboratorId === userId;

    if (!isOwner && !isSelfRemoval) {
      return NextResponse.json(
        { error: 'You do not have permission to remove this collaborator' },
        { status: 403 }
      );
    }

    // Remove collaborator
    const currentCollaborators = exam.collaborator_ids || [];
    const updatedCollaborators = currentCollaborators.filter(
      (id: string) => id !== collaboratorId
    );

    const { error: updateError } = await supabase
      .from('exams')
      .update({ collaborator_ids: updatedCollaborators })
      .eq('exam_id', examId);

    if (updateError) {
      console.error('Error removing collaborator:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove collaborator' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Collaborator removed successfully'
    });

  } catch (error) {
    console.error('Error removing collaborator:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
