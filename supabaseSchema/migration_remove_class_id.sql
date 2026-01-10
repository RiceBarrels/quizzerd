-- Migration: Remove class_id from exams and exam_attempts tables
-- This migration removes the internal class system in favor of Google Classroom integration
-- Applied: 2025-01-10

-- Drop RLS policies that reference class_id
DROP POLICY IF EXISTS "Class admins can view class exams" ON exams;
DROP POLICY IF EXISTS "Teachers view class attempts" ON exam_attempts;

-- Drop indexes on class_id
DROP INDEX IF EXISTS idx_exams_class;
DROP INDEX IF EXISTS idx_exam_attempts_class;

-- Remove class_id foreign key and column from exams table
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_class_id_fkey;
ALTER TABLE exams DROP COLUMN IF EXISTS class_id;

-- Remove class_id foreign key and column from exam_attempts table
ALTER TABLE exam_attempts DROP CONSTRAINT IF EXISTS exam_attempts_class_id_fkey;
ALTER TABLE exam_attempts DROP COLUMN IF EXISTS class_id;

-- Add comment to document the change
COMMENT ON TABLE exams IS 'Exams table - class_id removed in favor of Google Classroom integration with allowed_emails whitelist';
