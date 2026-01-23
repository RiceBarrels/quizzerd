-- Exam Presence Table
-- Tracks who is currently editing an exam in real-time
-- Note: Collaborator IDs are stored in exams.collaborator_ids (JSONB array)

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

-- Enable realtime for presence table
ALTER PUBLICATION supabase_realtime ADD TABLE exam_presence;
