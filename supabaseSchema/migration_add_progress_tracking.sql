-- Migration: Add Student Progress Tracking
-- Created: 2026-01-10

-- Add progress tracking columns to exam_attempts
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS progress JSONB DEFAULT '{}';
-- progress: { answered: number, total: number, lastActivity: timestamp }

ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS current_question INTEGER DEFAULT 0;

-- Index for efficient querying by session
CREATE INDEX IF NOT EXISTS idx_exam_attempts_session_progress
    ON exam_attempts(session_id) WHERE status = 'in_progress';

-- Index for last activity tracking
CREATE INDEX IF NOT EXISTS idx_exam_attempts_progress
    ON exam_attempts USING GIN(progress);
