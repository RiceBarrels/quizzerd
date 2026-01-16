import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// Email template types
export type EmailTemplateType =
  | 'exam_invitation'
  | 'exam_reminder'
  | 'result_notification'
  | 'session_closed';

// Available variables for each template type
export const TEMPLATE_VARIABLES: Record<EmailTemplateType, { key: string; label: string; description: string }[]> = {
  exam_invitation: [
    { key: 'exam_name', label: 'Exam Name', description: 'The name of the exam' },
    { key: 'course_name', label: 'Course Name', description: 'The Google Classroom course name' },
    { key: 'teacher_name', label: 'Teacher Name', description: 'Your name as the teacher' },
    { key: 'exam_url', label: 'Exam URL', description: 'Link to the exam' },
    { key: 'due_date', label: 'Due Date', description: 'The exam deadline' },
    { key: 'student_name', label: 'Student Name', description: 'The recipient student name' },
  ],
  exam_reminder: [
    { key: 'exam_name', label: 'Exam Name', description: 'The name of the exam' },
    { key: 'due_date', label: 'Due Date', description: 'The exam deadline' },
    { key: 'remaining_time', label: 'Remaining Time', description: 'Time until deadline' },
    { key: 'exam_url', label: 'Exam URL', description: 'Link to the exam' },
    { key: 'student_name', label: 'Student Name', description: 'The recipient student name' },
  ],
  result_notification: [
    { key: 'student_name', label: 'Student Name', description: 'The student name' },
    { key: 'exam_name', label: 'Exam Name', description: 'The name of the exam' },
    { key: 'score', label: 'Score', description: 'Points earned' },
    { key: 'max_score', label: 'Max Score', description: 'Maximum possible points' },
    { key: 'percentage', label: 'Percentage', description: 'Score percentage' },
    { key: 'result_url', label: 'Result URL', description: 'Link to view detailed results' },
  ],
  session_closed: [
    { key: 'exam_name', label: 'Exam Name', description: 'The name of the exam' },
    { key: 'course_name', label: 'Course Name', description: 'The course name' },
    { key: 'total_students', label: 'Total Students', description: 'Number of students who took the exam' },
    { key: 'average_score', label: 'Average Score', description: 'Average score percentage' },
  ],
};

// Default templates for each type
const DEFAULT_TEMPLATES: Record<EmailTemplateType, { subject: string; html_content: string }> = {
  exam_invitation: {
    subject: 'You are invited to take: {{exam_name}}',
    html_content: `
<h2>Exam Invitation</h2>
<p>Hello {{student_name}},</p>
<p>You have been invited to take <strong>{{exam_name}}</strong> for {{course_name}}.</p>
<p><strong>Due Date:</strong> {{due_date}}</p>
<p>Click the button below to start your exam:</p>
<p><a href="{{exam_url}}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Start Exam</a></p>
<p>Good luck!</p>
<p>Best regards,<br>{{teacher_name}}</p>
    `.trim(),
  },
  exam_reminder: {
    subject: 'Reminder: {{exam_name}} is due soon',
    html_content: `
<h2>Exam Reminder</h2>
<p>Hello {{student_name}},</p>
<p>This is a reminder that <strong>{{exam_name}}</strong> is due soon.</p>
<p><strong>Time Remaining:</strong> {{remaining_time}}</p>
<p><strong>Due Date:</strong> {{due_date}}</p>
<p>Click below to complete your exam:</p>
<p><a href="{{exam_url}}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px;">Complete Exam Now</a></p>
    `.trim(),
  },
  result_notification: {
    subject: 'Your results for {{exam_name}}',
    html_content: `
<h2>Exam Results</h2>
<p>Hello {{student_name}},</p>
<p>Your results for <strong>{{exam_name}}</strong> are now available.</p>
<div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <p style="margin: 0;"><strong>Score:</strong> {{score}} / {{max_score}} ({{percentage}}%)</p>
</div>
<p><a href="{{result_url}}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">View Detailed Results</a></p>
    `.trim(),
  },
  session_closed: {
    subject: 'Exam session closed: {{exam_name}}',
    html_content: `
<h2>Exam Session Closed</h2>
<p>The exam session for <strong>{{exam_name}}</strong> in {{course_name}} has been closed.</p>
<div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
  <p style="margin: 4px 0;"><strong>Total Students:</strong> {{total_students}}</p>
  <p style="margin: 4px 0;"><strong>Average Score:</strong> {{average_score}}%</p>
</div>
    `.trim(),
  },
};

// GET - Fetch all templates for user
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as EmailTemplateType | null;

    const supabase = await createSupabaseClient();

    let query = supabase
      .from('email_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    // Return templates with default templates info
    return NextResponse.json({
      success: true,
      data: templates || [],
      defaultTemplates: DEFAULT_TEMPLATES,
      variables: TEMPLATE_VARIABLES,
    });
  } catch (error) {
    console.error('Error in GET /api/email-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new template
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, name, subject, html_content, is_default } = body;

    if (!type || !name || !subject || !html_content) {
      return NextResponse.json(
        { error: 'Type, name, subject, and content are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // If setting as default, first unset any existing default for this type
    if (is_default) {
      await supabase
        .from('email_templates')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('type', type)
        .eq('is_default', true);
    }

    const { data: template, error } = await supabase
      .from('email_templates')
      .insert({
        user_id: userId,
        type,
        name,
        subject,
        html_content,
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error in POST /api/email-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update template
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { template_id, name, subject, html_content, is_active, is_default } = body;

    if (!template_id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const supabase = await createSupabaseClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('email_templates')
      .select('type')
      .eq('template_id', template_id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // If setting as default, first unset any existing default for this type
    if (is_default) {
      await supabase
        .from('email_templates')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('type', existing.type)
        .eq('is_default', true);
    }

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (subject !== undefined) updates.subject = subject;
    if (html_content !== undefined) updates.html_content = html_content;
    if (is_active !== undefined) updates.is_active = is_active;
    if (is_default !== undefined) updates.is_default = is_default;

    const { data: template, error } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('template_id', template_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Error in PATCH /api/email-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete template
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const supabase = await createSupabaseClient();

    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('template_id', templateId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/email-templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
