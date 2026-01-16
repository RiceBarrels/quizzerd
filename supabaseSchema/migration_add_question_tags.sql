-- Migration: Add Question Tags System
-- Created: 2026-01-10

-- Create question_tags table
CREATE TABLE IF NOT EXISTS question_tags (
    tag_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,  -- Clerk user ID (creator)
    tag_name TEXT NOT NULL,
    tag_color TEXT DEFAULT 'gray',
    tag_category TEXT,  -- difficulty, topic, chapter, bloom, custom
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: user can't have duplicate tag names
CREATE UNIQUE INDEX IF NOT EXISTS idx_question_tags_unique
    ON question_tags(user_id, tag_name);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_question_tags_user
    ON question_tags(user_id);

CREATE INDEX IF NOT EXISTS idx_question_tags_category
    ON question_tags(tag_category);

-- Enable RLS
ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for question_tags
CREATE POLICY "Users can view their own tags"
    ON question_tags FOR SELECT
    USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can create their own tags"
    ON question_tags FOR INSERT
    WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own tags"
    ON question_tags FOR UPDATE
    USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can delete their own tags"
    ON question_tags FOR DELETE
    USING (user_id = auth.jwt() ->> 'sub');

-- Insert default system tags (these will be inserted per-user on first use)
-- The application will handle creating default tags for new users
