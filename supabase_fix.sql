-- 1. Add metrics columns to projects table if they are missing
ALTER TABLE projects ADD COLUMN IF NOT EXISTS impact_metric TEXT DEFAULT '0';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS growth_metric TEXT DEFAULT '1.0';

-- 2. Create project_images table if it doesn't exist
-- This table stores additional photos for the project gallery
CREATE TABLE IF NOT EXISTS project_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure Row Level Security (RLS) is enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_images ENABLE ROW LEVEL SECURITY;

-- 4. Set up Access Policies
-- Everyone (even visitors) can see projects and their images
DROP POLICY IF EXISTS "Public Read Projects" ON projects;
CREATE POLICY "Public Read Projects" ON projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Project Images" ON project_images;
CREATE POLICY "Public Read Project Images" ON project_images FOR SELECT USING (true);

-- Only Admins can create, update, or delete projects and images
-- We check the 'profiles' table to verify if the current user is an admin
DROP POLICY IF EXISTS "Admin CRUD Projects" ON projects;
CREATE POLICY "Admin CRUD Projects" ON projects FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admin CRUD Project Images" ON project_images;
CREATE POLICY "Admin CRUD Project Images" ON project_images FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
