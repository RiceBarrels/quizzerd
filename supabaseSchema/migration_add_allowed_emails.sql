-- Migration: Add allowed_emails column to exams table for email-based access control
-- Applied: 2025-01-09

-- Add allowed_emails column to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS allowed_emails JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance on allowed_emails
CREATE INDEX IF NOT EXISTS idx_exams_allowed_emails ON exams USING GIN(allowed_emails);

-- Add comment to document the column
COMMENT ON COLUMN exams.allowed_emails IS 'Array of email addresses allowed to take this exam. Empty array means no restriction (public or class-based access).';
