import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// System-provided default templates
const SYSTEM_TEMPLATES = [
  {
    template_id: 'system-standard',
    name: 'Standard Exam',
    description: 'Suitable for general classroom tests',
    is_system: true,
    settings: {
      duration_minutes: 60,
      attempts_allowed: 1,
      passing_score: 70,
      shuffle_items: false,
      show_results_immediately: true,
      console_detection: false,
      translation_detection: false,
      visibility_change_detection: true,
      location_detection: false,
    }
  },
  {
    template_id: 'system-strict',
    name: 'Strict Mode',
    description: 'For important exams with strong anti-cheating measures',
    is_system: true,
    settings: {
      duration_minutes: 90,
      attempts_allowed: 1,
      passing_score: 60,
      shuffle_items: true,
      show_results_immediately: false,
      console_detection: true,
      translation_detection: true,
      visibility_change_detection: true,
      location_detection: false,
    }
  },
  {
    template_id: 'system-practice',
    name: 'Practice Mode',
    description: 'No time limit, see results immediately',
    is_system: true,
    settings: {
      duration_minutes: 0, // No time limit
      attempts_allowed: 999,
      passing_score: 0,
      shuffle_items: true,
      show_results_immediately: true,
      console_detection: false,
      translation_detection: false,
      visibility_change_detection: false,
      location_detection: false,
    }
  },
  {
    template_id: 'system-quick-quiz',
    name: 'Quick Quiz',
    description: 'Short 15-minute quiz for quick assessments',
    is_system: true,
    settings: {
      duration_minutes: 15,
      attempts_allowed: 2,
      passing_score: 70,
      shuffle_items: true,
      show_results_immediately: true,
      console_detection: false,
      translation_detection: false,
      visibility_change_detection: false,
      location_detection: false,
    }
  }
];

// GET - Fetch all templates (system + user)
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseClient();

    // Fetch user's templates
    const { data: userTemplates, error } = await supabase
      .from('exam_settings_templates')
      .select('*')
      .eq('user_id', userId)
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('Error fetching templates:', error);
    }

    // Combine system templates with user templates
    const allTemplates = [
      ...SYSTEM_TEMPLATES,
      ...(userTemplates || []).map(t => ({
        ...t,
        is_system: false
      }))
    ];

    return NextResponse.json({
      success: true,
      data: allTemplates
    });

  } catch (error) {
    console.error('Error in templates API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new template
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, settings, is_default } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // If setting as default, unset other defaults
    if (is_default) {
      await supabase
        .from('exam_settings_templates')
        .update({ is_default: false })
        .eq('user_id', userId)
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('exam_settings_templates')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || null,
        settings,
        is_default: is_default || false,
        is_system: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a template
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Cannot delete system templates
    if (templateId.startsWith('system-')) {
      return NextResponse.json(
        { error: 'Cannot delete system templates' },
        { status: 403 }
      );
    }

    const supabase = await createSupabaseClient();

    const { error } = await supabase
      .from('exam_settings_templates')
      .delete()
      .eq('template_id', templateId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update usage count when template is applied
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { template_id } = body;

    if (!template_id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Don't update usage for system templates
    if (template_id.startsWith('system-')) {
      return NextResponse.json({ success: true });
    }

    const supabase = await createSupabaseClient();

    // Increment usage count
    const { error } = await supabase.rpc('increment_template_usage', {
      p_template_id: template_id
    });

    // If RPC doesn't exist, try direct update
    if (error) {
      await supabase
        .from('exam_settings_templates')
        .update({
          usage_count: supabase.rpc('increment', { x: 1 }),
          updated_at: new Date().toISOString()
        })
        .eq('template_id', template_id)
        .eq('user_id', userId);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
