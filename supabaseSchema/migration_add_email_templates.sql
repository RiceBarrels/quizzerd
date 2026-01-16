-- Migration: Add Email Templates
-- Created: 2026-01-10

-- Create email templates table
CREATE TABLE IF NOT EXISTS email_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,

    -- Template information
    type TEXT NOT NULL,  -- exam_invitation, exam_reminder, result_notification, session_closed
    name TEXT NOT NULL,

    -- Template content
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_email_templates_user ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(user_id, type);

-- Unique constraint for default template per type per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_default
    ON email_templates(user_id, type)
    WHERE is_default = true;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_email_templates_updated_at();
