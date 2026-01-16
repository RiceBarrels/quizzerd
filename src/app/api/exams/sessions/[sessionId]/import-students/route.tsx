import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { sessionId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { emails, csvData, appendMode = true } = body;

    // Parse emails from either direct array or CSV data
    let emailList: string[] = [];

    if (emails && Array.isArray(emails)) {
      emailList = emails;
    } else if (csvData && typeof csvData === 'string') {
      // Parse CSV - support multiple formats
      // Each line can contain: email, "name,email", or "email,name"
      const lines = csvData.split(/\r?\n/).filter(line => line.trim());

      for (const line of lines) {
        // Skip header row if detected
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('email') && (lowerLine.includes('name') || lowerLine.includes('student'))) {
          continue;
        }

        // Try to extract email from the line
        const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));

        for (const part of parts) {
          if (EMAIL_REGEX.test(part)) {
            emailList.push(part.toLowerCase());
            break; // Found email, move to next line
          }
        }
      }
    }

    if (emailList.length === 0) {
      return NextResponse.json(
        { error: 'No valid emails found in the input' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Fetch the session
    const { data: sessionData, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check permission - must be creator
    if (sessionData.created_by !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this session' },
        { status: 403 }
      );
    }

    // Validate and deduplicate emails
    const validEmails: string[] = [];
    const invalidEmails: string[] = [];
    const seenEmails = new Set<string>();

    for (const email of emailList) {
      const normalizedEmail = email.toLowerCase().trim();

      if (seenEmails.has(normalizedEmail)) {
        continue; // Skip duplicates in input
      }
      seenEmails.add(normalizedEmail);

      if (EMAIL_REGEX.test(normalizedEmail)) {
        validEmails.push(normalizedEmail);
      } else {
        invalidEmails.push(email);
      }
    }

    // Get existing emails
    const existingEmailsArray: string[] = (sessionData.allowed_emails || [])
      .map((e: string) => e.toLowerCase());
    const existingEmails = new Set(existingEmailsArray);

    // Calculate new emails to add
    const newEmails = validEmails.filter(e => !existingEmails.has(e));
    const duplicateEmails = validEmails.filter(e => existingEmails.has(e));

    // Merge or replace based on mode
    let finalEmails: string[];
    if (appendMode) {
      finalEmails = [...existingEmailsArray, ...newEmails];
    } else {
      finalEmails = validEmails;
    }

    // Update the session
    const { error: updateError } = await supabase
      .from('exam_sessions')
      .update({
        allowed_emails: finalEmails,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        totalProcessed: emailList.length,
        validCount: validEmails.length,
        addedCount: newEmails.length,
        duplicateCount: duplicateEmails.length,
        invalidCount: invalidEmails.length,
        finalCount: finalEmails.length,
        invalidEmails: invalidEmails.slice(0, 10), // Return first 10 invalid emails
        addedEmails: newEmails.slice(0, 10) // Return first 10 added emails
      },
      message: `Successfully imported ${newEmails.length} new student(s). ${duplicateEmails.length} were already in the list.`
    });

  } catch (error) {
    console.error('Error importing students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to download current student list as CSV
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { sessionId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseClient();

    // Fetch the session
    const { data: sessionData, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('allowed_emails, google_course_name, created_by')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check permission
    if (sessionData.created_by !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const emails = sessionData.allowed_emails || [];

    // Create CSV content
    const csvContent = ['email', ...emails].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="students-${sessionId.slice(0, 8)}.csv"`
      }
    });

  } catch (error) {
    console.error('Error exporting students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
