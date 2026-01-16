-- Migration: Add Webhook Integration
-- Created: 2026-01-10

-- Create webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    webhook_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,

    -- Webhook configuration
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT,  -- For signature verification

    -- Event subscriptions
    events TEXT[] NOT NULL,  -- Subscribed event types

    -- Filters (optional)
    exam_ids UUID[],  -- Only for specific exams

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

-- Create webhook logs table
CREATE TABLE IF NOT EXISTS webhook_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID REFERENCES webhooks(webhook_id) ON DELETE CASCADE,

    -- Request details
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,

    -- Response details
    status_code INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,

    -- Status
    success BOOLEAN,
    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs(created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_webhooks_updated_at();
