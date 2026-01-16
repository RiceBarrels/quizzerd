-- Migration: Add Exam Version Control
-- Created: 2026-01-10

-- Create exam versions table
CREATE TABLE IF NOT EXISTS exam_versions (
    version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(exam_id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,

    -- Complete snapshot
    exam_name TEXT NOT NULL,
    exam_description TEXT,
    items JSONB NOT NULL,
    total_points INTEGER,
    settings JSONB,

    -- Change information
    change_summary TEXT,
    changed_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(exam_id, version_number)
);

-- Index for version queries
CREATE INDEX IF NOT EXISTS idx_exam_versions_exam ON exam_versions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_versions_created ON exam_versions(created_at DESC);
