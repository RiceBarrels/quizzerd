-- Exam Collaborators Table
-- Allows multiple teachers to edit the same exam

CREATE TABLE IF NOT EXISTS exam_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,

    -- Collaborator info
    user_id TEXT NOT NULL,  -- Clerk user ID
    email TEXT NOT NULL,

    -- Role and permissions
    role VARCHAR(20) DEFAULT 'editor',  -- owner, editor, viewer
    can_edit BOOLEAN DEFAULT TRUE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_invite BOOLEAN DEFAULT FALSE,

    -- Status
    status VARCHAR(20) DEFAULT 'pending',  -- pending, accepted, declined

    -- Metadata
    invited_by TEXT NOT NULL,  -- Clerk user ID of inviter
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,

    -- Ensure unique collaborator per exam
    UNIQUE(exam_id, email)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_exam_collaborators_exam ON exam_collaborators(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_collaborators_user ON exam_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_collaborators_email ON exam_collaborators(email);

-- Enable RLS
ALTER TABLE exam_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view collaborators for their exams"
    ON exam_collaborators FOR SELECT
    USING (
        user_id = current_setting('app.current_user_id', true)
        OR exam_id IN (
            SELECT exam_id FROM exams WHERE created_by = current_setting('app.current_user_id', true)
        )
        OR exam_id IN (
            SELECT exam_id FROM exam_collaborators WHERE user_id = current_setting('app.current_user_id', true)
        )
    );

-- Exam editing presence table for real-time tracking
CREATE TABLE IF NOT EXISTS exam_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    user_name TEXT,
    user_email TEXT,
    user_avatar TEXT,

    -- Editing context
    current_question_id UUID,
    cursor_position JSONB,

    -- Timestamps
    last_seen TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(exam_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_presence_exam ON exam_presence(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_presence_last_seen ON exam_presence(last_seen);

-- Function to clean up stale presence records (older than 5 minutes)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
    DELETE FROM exam_presence WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE exam_collaborators;
ALTER PUBLICATION supabase_realtime ADD TABLE exam_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE exams;
