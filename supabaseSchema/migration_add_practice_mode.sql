-- Migration: Add Practice Mode to Exams
-- Created: 2026-01-10

-- Add practice mode columns to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_practice_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS show_explanations BOOLEAN DEFAULT TRUE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS allow_retry_questions BOOLEAN DEFAULT TRUE;

-- Index for practice mode queries
CREATE INDEX IF NOT EXISTS idx_exams_practice_mode
    ON exams(is_practice_mode) WHERE is_practice_mode = true;
