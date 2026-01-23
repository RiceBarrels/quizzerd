-- Migration: Add user settings columns
-- Applied: 2025-01-16

-- Add settings columns to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS exam_reminders BOOLEAN DEFAULT true;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS result_notifications BOOLEAN DEFAULT true;

-- Exam defaults
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS default_duration INTEGER DEFAULT 60;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS default_points INTEGER DEFAULT 10;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS default_question_type VARCHAR(50) DEFAULT 'multiple_choice';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS auto_save_interval INTEGER DEFAULT 30;

-- AI settings
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS show_ai_assistant BOOLEAN DEFAULT true;

-- Localization
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS time_format VARCHAR(10) DEFAULT '12h';

-- Appearance
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'system';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS compact_mode BOOLEAN DEFAULT false;

-- Comments
COMMENT ON COLUMN "user".email_notifications IS 'Whether to receive email notifications';
COMMENT ON COLUMN "user".exam_reminders IS 'Whether to receive exam deadline reminders';
COMMENT ON COLUMN "user".result_notifications IS 'Whether to receive notifications when students complete exams';
COMMENT ON COLUMN "user".default_duration IS 'Default exam duration in minutes';
COMMENT ON COLUMN "user".default_points IS 'Default points per question';
COMMENT ON COLUMN "user".default_question_type IS 'Default question type for new questions';
COMMENT ON COLUMN "user".auto_save_interval IS 'Auto-save interval in seconds';
COMMENT ON COLUMN "user".show_ai_assistant IS 'Whether to show AI assistant sidebar';
COMMENT ON COLUMN "user".language IS 'User interface language preference';
COMMENT ON COLUMN "user".date_format IS 'Preferred date format';
COMMENT ON COLUMN "user".time_format IS 'Preferred time format (12h or 24h)';
COMMENT ON COLUMN "user".theme IS 'UI theme preference (light, dark, system)';
COMMENT ON COLUMN "user".compact_mode IS 'Whether to use compact UI mode';
