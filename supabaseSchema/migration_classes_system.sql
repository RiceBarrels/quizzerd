-- =====================================================
-- Classes System Migration
-- Replaces Sessions with Google Classroom-style Classes
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CLASSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS classes (
    class_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic info
    class_name TEXT NOT NULL,
    class_description TEXT,
    class_code VARCHAR(8) UNIQUE NOT NULL,

    -- Appearance
    banner_color VARCHAR(20) DEFAULT '#4285f4',
    banner_image TEXT,

    -- Google Classroom sync (optional)
    google_course_id TEXT,
    google_course_name TEXT,
    google_sync_enabled BOOLEAN DEFAULT FALSE,

    -- Settings
    allow_join_by_code BOOLEAN DEFAULT TRUE,
    auto_accept_students BOOLEAN DEFAULT TRUE,

    -- Status: active, archived
    status VARCHAR(20) DEFAULT 'active',

    -- Metadata
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for classes
CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(class_code);
CREATE INDEX IF NOT EXISTS idx_classes_created_by ON classes(created_by);
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_classes_google_course ON classes(google_course_id);

-- =====================================================
-- 2. CLASS MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS class_members (
    member_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,

    -- Member info
    user_id TEXT,  -- Clerk user ID (null if invited but not signed up)
    email TEXT NOT NULL,
    display_name TEXT,

    -- Role: student, teacher, co-teacher
    role VARCHAR(20) DEFAULT 'student',

    -- Status: invited, active, removed
    status VARCHAR(20) DEFAULT 'active',

    -- Metadata
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_by TEXT,
    invitation_sent_at TIMESTAMPTZ,

    UNIQUE(class_id, email)
);

-- Indexes for class_members
CREATE INDEX IF NOT EXISTS idx_class_members_class ON class_members(class_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user ON class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_class_members_email ON class_members(email);
CREATE INDEX IF NOT EXISTS idx_class_members_role ON class_members(role);
CREATE INDEX IF NOT EXISTS idx_class_members_status ON class_members(status);

-- =====================================================
-- 3. CLASS EXAMS TABLE (Link exams to classes)
-- =====================================================
CREATE TABLE IF NOT EXISTS class_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,

    -- Class-specific settings (override exam defaults)
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    points_possible INTEGER,

    -- Status: draft, published, closed
    status VARCHAR(20) DEFAULT 'draft',

    -- Display order
    sort_order INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,

    UNIQUE(class_id, exam_id)
);

-- Indexes for class_exams
CREATE INDEX IF NOT EXISTS idx_class_exams_class ON class_exams(class_id);
CREATE INDEX IF NOT EXISTS idx_class_exams_exam ON class_exams(exam_id);
CREATE INDEX IF NOT EXISTS idx_class_exams_status ON class_exams(status);

-- =====================================================
-- 4. CLASS ANNOUNCEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS class_announcements (
    announcement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,

    -- Content
    title TEXT,
    content TEXT NOT NULL,

    -- Attachments (array of {name, url, type})
    attachments JSONB DEFAULT '[]'::jsonb,

    -- Settings
    pinned BOOLEAN DEFAULT FALSE,

    -- Schedule (null = posted immediately)
    scheduled_at TIMESTAMPTZ,

    -- Metadata
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for class_announcements
CREATE INDEX IF NOT EXISTS idx_class_announcements_class ON class_announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_class_announcements_pinned ON class_announcements(pinned);
CREATE INDEX IF NOT EXISTS idx_class_announcements_created ON class_announcements(created_at DESC);

-- =====================================================
-- 5. UPDATE EXAM_ATTEMPTS TABLE
-- =====================================================
-- Add class_id column to exam_attempts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'exam_attempts' AND column_name = 'class_id'
    ) THEN
        ALTER TABLE exam_attempts ADD COLUMN class_id UUID REFERENCES classes(class_id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_exam_attempts_class ON exam_attempts(class_id);
    END IF;
END $$;

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to generate unique class code
CREATE OR REPLACE FUNCTION generate_class_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghjkmnpqrstuvwxyz23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get unique class code (with retry)
CREATE OR REPLACE FUNCTION get_unique_class_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    max_attempts INTEGER := 10;
    attempt INTEGER := 0;
BEGIN
    LOOP
        new_code := generate_class_code();
        attempt := attempt + 1;

        -- Check if code exists
        IF NOT EXISTS (SELECT 1 FROM classes WHERE class_code = new_code) THEN
            RETURN new_code;
        END IF;

        IF attempt >= max_attempts THEN
            RAISE EXCEPTION 'Could not generate unique class code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp for classes
CREATE OR REPLACE FUNCTION update_classes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_classes_updated_at ON classes;
CREATE TRIGGER trigger_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_classes_updated_at();

-- Auto-update updated_at timestamp for announcements
DROP TRIGGER IF EXISTS trigger_announcements_updated_at ON class_announcements;
CREATE TRIGGER trigger_announcements_updated_at
    BEFORE UPDATE ON class_announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_classes_updated_at();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_announcements ENABLE ROW LEVEL SECURITY;

-- Classes policies
CREATE POLICY "Users can view classes they are members of" ON classes
    FOR SELECT USING (
        created_by = auth.uid()::text
        OR EXISTS (
            SELECT 1 FROM class_members
            WHERE class_members.class_id = classes.class_id
            AND class_members.user_id = auth.uid()::text
            AND class_members.status = 'active'
        )
    );

CREATE POLICY "Users can create classes" ON classes
    FOR INSERT WITH CHECK (created_by = auth.uid()::text);

CREATE POLICY "Class creators can update their classes" ON classes
    FOR UPDATE USING (created_by = auth.uid()::text);

CREATE POLICY "Class creators can delete their classes" ON classes
    FOR DELETE USING (created_by = auth.uid()::text);

-- Class members policies
CREATE POLICY "Members can view class members" ON class_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM class_members cm
            WHERE cm.class_id = class_members.class_id
            AND cm.user_id = auth.uid()::text
            AND cm.status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM classes
            WHERE classes.class_id = class_members.class_id
            AND classes.created_by = auth.uid()::text
        )
    );

CREATE POLICY "Teachers can manage members" ON class_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.class_id = class_members.class_id
            AND classes.created_by = auth.uid()::text
        )
        OR EXISTS (
            SELECT 1 FROM class_members cm
            WHERE cm.class_id = class_members.class_id
            AND cm.user_id = auth.uid()::text
            AND cm.role IN ('teacher', 'co-teacher')
            AND cm.status = 'active'
        )
    );

-- Class exams policies
CREATE POLICY "Members can view class exams" ON class_exams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM class_members
            WHERE class_members.class_id = class_exams.class_id
            AND class_members.user_id = auth.uid()::text
            AND class_members.status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM classes
            WHERE classes.class_id = class_exams.class_id
            AND classes.created_by = auth.uid()::text
        )
    );

CREATE POLICY "Teachers can manage class exams" ON class_exams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.class_id = class_exams.class_id
            AND classes.created_by = auth.uid()::text
        )
        OR EXISTS (
            SELECT 1 FROM class_members
            WHERE class_members.class_id = class_exams.class_id
            AND class_members.user_id = auth.uid()::text
            AND class_members.role IN ('teacher', 'co-teacher')
            AND class_members.status = 'active'
        )
    );

-- Announcements policies
CREATE POLICY "Members can view announcements" ON class_announcements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM class_members
            WHERE class_members.class_id = class_announcements.class_id
            AND class_members.user_id = auth.uid()::text
            AND class_members.status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM classes
            WHERE classes.class_id = class_announcements.class_id
            AND classes.created_by = auth.uid()::text
        )
    );

CREATE POLICY "Teachers can manage announcements" ON class_announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.class_id = class_announcements.class_id
            AND classes.created_by = auth.uid()::text
        )
        OR EXISTS (
            SELECT 1 FROM class_members
            WHERE class_members.class_id = class_announcements.class_id
            AND class_members.user_id = auth.uid()::text
            AND class_members.role IN ('teacher', 'co-teacher')
            AND class_members.status = 'active'
        )
    );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
