-- Migration: Create exam_sessions table for Google Classroom publishing
-- Applied: 2025-01-10

-- Create exam_sessions table
CREATE TABLE exam_sessions (
    session_id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    exam_id UUID REFERENCES exams(exam_id) ON DELETE CASCADE,

    -- Google Classroom info
    google_course_id TEXT NOT NULL,
    google_course_name TEXT,
    google_classroom_id TEXT,

    -- Access control
    allowed_emails JSONB DEFAULT '[]'::jsonb,

    -- Time settings
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,

    -- Status
    status VARCHAR(50) DEFAULT 'active',  -- active, closed, archived

    -- Metadata
    created_by TEXT NOT NULL,  -- Clerk user ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exam_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX idx_exam_sessions_course ON exam_sessions(google_course_id);
CREATE INDEX idx_exam_sessions_allowed_emails ON exam_sessions USING GIN(allowed_emails);
CREATE INDEX idx_exam_sessions_status ON exam_sessions(status);

-- RLS
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

-- Creators can view their sessions
CREATE POLICY "Creators view sessions" ON exam_sessions
    FOR SELECT
    USING (created_by = (auth.jwt() ->> 'sub'::text));

-- Exam creators/collaborators can view sessions
CREATE POLICY "Exam owners view sessions" ON exam_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM exams
            WHERE exams.exam_id = exam_sessions.exam_id
            AND (
                exams.creator_id = (auth.jwt() ->> 'sub'::text)
                OR exams.collaborator_ids::jsonb ? (auth.jwt() ->> 'sub'::text)
            )
        )
    );

-- Creators can insert sessions
CREATE POLICY "Creators insert sessions" ON exam_sessions
    FOR INSERT
    WITH CHECK (created_by = (auth.jwt() ->> 'sub'::text));

-- Creators can update their sessions
CREATE POLICY "Creators update sessions" ON exam_sessions
    FOR UPDATE
    USING (created_by = (auth.jwt() ->> 'sub'::text));

-- Trigger for updated_at
CREATE TRIGGER update_exam_sessions_updated_at
    BEFORE UPDATE ON exam_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE exam_sessions IS 'Stores exam sessions for Google Classroom publishing. Each session represents one exam published to one Google Classroom course.';

-- Add session_id to exam_attempts
ALTER TABLE exam_attempts ADD COLUMN session_id UUID REFERENCES exam_sessions(session_id) ON DELETE SET NULL;
CREATE INDEX idx_exam_attempts_session ON exam_attempts(session_id);
COMMENT ON COLUMN exam_attempts.session_id IS 'Reference to the exam session this attempt belongs to';
