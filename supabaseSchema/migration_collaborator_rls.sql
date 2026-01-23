-- Migration: Add/Update RLS policies for collaborators to edit exams
-- Run this in Supabase SQL Editor

-- Drop existing collaborator update policy if it exists
DROP POLICY IF EXISTS "Collaborators can update shared exams" ON exams;

-- Create new policy for collaborators to update exams
-- Uses @> operator to check if collaborator_ids array contains the user ID
CREATE POLICY "Collaborators can update shared exams" ON exams
    FOR UPDATE
    USING (
        collaborator_ids @> to_jsonb(ARRAY[auth.jwt() ->> 'sub'])::jsonb
    )
    WITH CHECK (
        collaborator_ids @> to_jsonb(ARRAY[auth.jwt() ->> 'sub'])::jsonb
    );

-- Alternative syntax if the above doesn't work (using text array containment)
-- DROP POLICY IF EXISTS "Collaborators can update shared exams" ON exams;
-- CREATE POLICY "Collaborators can update shared exams" ON exams
--     FOR UPDATE
--     USING (
--         (auth.jwt() ->> 'sub') = ANY(
--             SELECT jsonb_array_elements_text(collaborator_ids)
--         )
--     )
--     WITH CHECK (
--         (auth.jwt() ->> 'sub') = ANY(
--             SELECT jsonb_array_elements_text(collaborator_ids)
--         )
--     );

-- Verify policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'exams';
