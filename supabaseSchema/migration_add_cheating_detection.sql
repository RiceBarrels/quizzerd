-- Migration: Add cheating detection settings to exams table
-- Run this migration to add cheating detection columns to your existing exams table

-- Add cheating detection columns to exams table
ALTER TABLE exams 
ADD COLUMN IF NOT EXISTS console_detection BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS translation_detection BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_word_by_word_translation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_word_by_word_definition BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visibility_change_detection BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location_detection BOOLEAN DEFAULT false;

-- Add comments to document the columns
COMMENT ON COLUMN exams.console_detection IS 'Detect developer console usage during exam';
COMMENT ON COLUMN exams.translation_detection IS 'Detect translation tools during exam';
COMMENT ON COLUMN exams.allow_word_by_word_translation IS 'Allow students to translate individual words';
COMMENT ON COLUMN exams.allow_word_by_word_definition IS 'Allow students to look up word definitions';
COMMENT ON COLUMN exams.visibility_change_detection IS 'Detect tab switching and window minimizing';
COMMENT ON COLUMN exams.location_detection IS 'Monitor physical location changes during exam';

-- Create exam_violations table to track cheating detection events
CREATE TABLE IF NOT EXISTS exam_violations (
    violation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(exam_id) ON DELETE CASCADE,
    attempt_id UUID REFERENCES exam_attempts(attempt_id) ON DELETE CASCADE,
    student_id TEXT NOT NULL, -- Clerk user ID
    
    -- Violation details
    violation_type VARCHAR(50) NOT NULL, -- console, visibility, translation, location, context_menu
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT false,
    details JSONB DEFAULT '{}'::jsonb, -- Additional data (e.g., location coordinates, browser info)
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for exam_violations
CREATE INDEX IF NOT EXISTS idx_exam_violations_exam ON exam_violations(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_violations_attempt ON exam_violations(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_violations_student ON exam_violations(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_violations_type ON exam_violations(violation_type);
CREATE INDEX IF NOT EXISTS idx_exam_violations_timestamp ON exam_violations(timestamp);

-- Add comments to exam_violations table
COMMENT ON TABLE exam_violations IS 'Tracks cheating detection events during exam attempts';
COMMENT ON COLUMN exam_violations.violation_type IS 'Type of violation: console, visibility, translation, location, context_menu';
COMMENT ON COLUMN exam_violations.details IS 'Additional violation data in JSON format';

-- Enable RLS for exam_violations
ALTER TABLE exam_violations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Students view own violations" ON exam_violations;
DROP POLICY IF EXISTS "Teachers view exam violations" ON exam_violations;
DROP POLICY IF EXISTS "Students create violations" ON exam_violations;
DROP POLICY IF EXISTS "Students update own violations" ON exam_violations;

-- RLS Policy: Students can view their own violations
CREATE POLICY "Students view own violations" ON exam_violations
    FOR SELECT
    USING (student_id = (auth.jwt() ->> 'sub'::text));

-- RLS Policy: Teachers/admins can view all violations for their exams
CREATE POLICY "Teachers view exam violations" ON exam_violations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM exams
            WHERE exams.exam_id = exam_violations.exam_id
            AND (
                exams.creator_id = (auth.jwt() ->> 'sub'::text)
                OR exams.collaborator_ids::jsonb ? (auth.jwt() ->> 'sub'::text)
            )
        )
    );

-- RLS Policy: Students can create their own violations (logged automatically by client)
CREATE POLICY "Students create violations" ON exam_violations
    FOR INSERT
    WITH CHECK (student_id = (auth.jwt() ->> 'sub'::text));

-- RLS Policy: Students can update acknowledgement of their violations
CREATE POLICY "Students update own violations" ON exam_violations
    FOR UPDATE
    USING (student_id = (auth.jwt() ->> 'sub'::text));

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Added cheating detection columns to exams table';
    RAISE NOTICE 'Created exam_violations table with RLS policies';
END $$;

