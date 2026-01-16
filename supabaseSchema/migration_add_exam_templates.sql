-- Migration: Add Exam Settings Templates
-- Created: 2026-01-10

-- Create exam_settings_templates table
CREATE TABLE IF NOT EXISTS exam_settings_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,  -- Clerk user ID (creator)

    -- Template info
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE,  -- System-provided templates

    -- Settings content (JSONB)
    settings JSONB NOT NULL,

    -- Metadata
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exam_settings_templates_user
    ON exam_settings_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_exam_settings_templates_system
    ON exam_settings_templates(is_system) WHERE is_system = true;

-- Enable RLS
ALTER TABLE exam_settings_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own templates and system templates"
    ON exam_settings_templates FOR SELECT
    USING (user_id = auth.jwt() ->> 'sub' OR is_system = true);

CREATE POLICY "Users can create their own templates"
    ON exam_settings_templates FOR INSERT
    WITH CHECK (user_id = auth.jwt() ->> 'sub' AND is_system = false);

CREATE POLICY "Users can update their own templates"
    ON exam_settings_templates FOR UPDATE
    USING (user_id = auth.jwt() ->> 'sub' AND is_system = false);

CREATE POLICY "Users can delete their own templates"
    ON exam_settings_templates FOR DELETE
    USING (user_id = auth.jwt() ->> 'sub' AND is_system = false);
