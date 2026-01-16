import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto';
import { testWebhook } from '@/lib/webhook';

// Available webhook event types
export const WEBHOOK_EVENTS = [
  { id: 'exam.published', label: 'Exam Published', description: 'When an exam is published to a classroom' },
  { id: 'attempt.started', label: 'Attempt Started', description: 'When a student starts an exam' },
  { id: 'attempt.submitted', label: 'Attempt Submitted', description: 'When a student submits an exam' },
  { id: 'violation.detected', label: 'Violation Detected', description: 'When a cheating violation is detected' },
  { id: 'session.ended', label: 'Session Ended', description: 'When an exam session deadline passes' },
];

// GET - List all webhooks for user
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('webhookId');

    const supabase = await createSupabaseClient();

    // If webhookId is provided, get logs for that webhook
    if (webhookId) {
      const { data: logs, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .eq('webhook_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching webhook logs:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: logs || [] });
    }

    // Otherwise, get all webhooks
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhooks:', error);
      return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: webhooks || [],
      events: WEBHOOK_EVENTS,
    });
  } catch (error) {
    console.error('Error in GET /api/webhooks/manage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new webhook or test existing one
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Test webhook
    if (body.action === 'test' && body.webhook_id) {
      const result = await testWebhook(body.webhook_id);
      return NextResponse.json({
        success: result.success,
        data: result,
      });
    }

    // Create new webhook
    const { name, url, events, secret, exam_ids } = body;

    if (!name || !url || !events || events.length === 0) {
      return NextResponse.json(
        { error: 'Name, URL, and at least one event are required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Validate events
    const validEventIds = WEBHOOK_EVENTS.map((e) => e.id);
    const invalidEvents = events.filter((e: string) => !validEventIds.includes(e));
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert({
        user_id: userId,
        name,
        url,
        events,
        secret: secret || crypto.randomUUID(),
        exam_ids: exam_ids || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating webhook:', error);
      return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: webhook });
  } catch (error) {
    console.error('Error in POST /api/webhooks/manage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update webhook
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { webhook_id, name, url, events, is_active, exam_ids } = body;

    if (!webhook_id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    }

    const supabase = await createSupabaseClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('webhooks')
      .select('user_id')
      .eq('webhook_id', webhook_id)
      .single();

    if (!existing || existing.user_id !== userId) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) {
      try {
        new URL(url);
        updates.url = url;
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
      }
    }
    if (events !== undefined) updates.events = events;
    if (is_active !== undefined) {
      updates.is_active = is_active;
      // Reset failure count when re-enabling
      if (is_active) updates.failure_count = 0;
    }
    if (exam_ids !== undefined) updates.exam_ids = exam_ids;

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .update(updates)
      .eq('webhook_id', webhook_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating webhook:', error);
      return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: webhook });
  } catch (error) {
    console.error('Error in PATCH /api/webhooks/manage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete webhook
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get('webhookId');

    if (!webhookId) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    }

    const supabase = await createSupabaseClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('webhooks')
      .select('user_id')
      .eq('webhook_id', webhookId)
      .single();

    if (!existing || existing.user_id !== userId) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('webhook_id', webhookId);

    if (error) {
      console.error('Error deleting webhook:', error);
      return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/webhooks/manage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
