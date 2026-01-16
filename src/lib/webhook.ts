import crypto from 'crypto';
import { createSupabaseClient } from './supabase';

// Webhook event types
export type WebhookEventType =
  | 'exam.published'
  | 'attempt.started'
  | 'attempt.submitted'
  | 'violation.detected'
  | 'session.ended';

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, any>;
}

interface Webhook {
  webhook_id: string;
  user_id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  exam_ids: string[] | null;
  is_active: boolean;
  failure_count: number;
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Send webhook to a single endpoint
 */
async function sendWebhook(
  webhook: Webhook,
  eventType: WebhookEventType,
  data: Record<string, any>
): Promise<{ success: boolean; statusCode?: number; responseBody?: string; errorMessage?: string; responseTimeMs: number }> {
  const payload: WebhookPayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadString = JSON.stringify(payload);
  const startTime = Date.now();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': eventType,
      'X-Webhook-Timestamp': payload.timestamp,
    };

    // Add signature if secret is provided
    if (webhook.secret) {
      const signature = generateSignature(payloadString, webhook.secret);
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const responseTimeMs = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');

    return {
      success: response.ok,
      statusCode: response.status,
      responseBody: responseBody.substring(0, 1000), // Limit response body size
      responseTimeMs,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      responseTimeMs,
    };
  }
}

/**
 * Trigger webhooks for a specific event
 */
export async function triggerWebhooks(
  userId: string,
  eventType: WebhookEventType,
  data: Record<string, any>,
  examId?: string
): Promise<void> {
  try {
    const supabase = await createSupabaseClient();

    // Find matching webhooks
    let query = supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .contains('events', [eventType]);

    const { data: webhooks, error } = await query;

    if (error || !webhooks || webhooks.length === 0) {
      return;
    }

    // Filter by exam_id if provided
    const matchingWebhooks = webhooks.filter((webhook: Webhook) => {
      if (!webhook.exam_ids || webhook.exam_ids.length === 0) {
        return true; // No filter, matches all exams
      }
      if (!examId) {
        return true; // No exam context, include webhook
      }
      return webhook.exam_ids.includes(examId);
    });

    // Send webhooks in parallel
    const results = await Promise.allSettled(
      matchingWebhooks.map(async (webhook: Webhook) => {
        const result = await sendWebhook(webhook, eventType, data);

        // Log the webhook attempt
        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.webhook_id,
          event_type: eventType,
          payload: data,
          status_code: result.statusCode,
          response_body: result.responseBody,
          response_time_ms: result.responseTimeMs,
          success: result.success,
          error_message: result.errorMessage,
        });

        // Update webhook status
        if (result.success) {
          await supabase
            .from('webhooks')
            .update({
              last_triggered_at: new Date().toISOString(),
              failure_count: 0,
            })
            .eq('webhook_id', webhook.webhook_id);
        } else {
          await supabase
            .from('webhooks')
            .update({
              failure_count: webhook.failure_count + 1,
              // Disable webhook after 10 consecutive failures
              is_active: webhook.failure_count + 1 < 10,
            })
            .eq('webhook_id', webhook.webhook_id);
        }

        return result;
      })
    );

    // Log any rejected promises
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Webhook ${matchingWebhooks[index]?.webhook_id} failed:`,
          result.reason
        );
      }
    });
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
}

/**
 * Test a webhook by sending a test event
 */
export async function testWebhook(webhookId: string): Promise<{
  success: boolean;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseClient();

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('webhook_id', webhookId)
      .single();

    if (error || !webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const testData = {
      test: true,
      message: 'This is a test webhook from QuizZerd',
      webhook_name: webhook.name,
    };

    const result = await sendWebhook(
      webhook,
      'attempt.submitted' as WebhookEventType, // Use a common event type for testing
      testData
    );

    // Log the test
    await supabase.from('webhook_logs').insert({
      webhook_id: webhookId,
      event_type: 'test',
      payload: testData,
      status_code: result.statusCode,
      response_body: result.responseBody,
      response_time_ms: result.responseTimeMs,
      success: result.success,
      error_message: result.errorMessage,
    });

    return {
      success: result.success,
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      error: result.errorMessage,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
