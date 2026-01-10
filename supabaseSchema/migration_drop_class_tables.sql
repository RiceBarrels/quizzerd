-- Migration: Drop class-related tables
-- Run this manually in Supabase SQL Editor

-- Drop class_assignments table first (depends on classes)
DROP TABLE IF EXISTS class_assignments CASCADE;

-- Drop class_members table (depends on classes)
DROP TABLE IF EXISTS class_members CASCADE;

-- Drop classes table
DROP TABLE IF EXISTS classes CASCADE;

-- Drop class_ids column from user table if exists
ALTER TABLE "user" DROP COLUMN IF EXISTS class_ids;

-- Drop class_id column from exams table if exists
ALTER TABLE exams DROP COLUMN IF EXISTS class_id;

-- Drop class_id column from exam_attempts table if exists
ALTER TABLE exam_attempts DROP COLUMN IF EXISTS class_id;
