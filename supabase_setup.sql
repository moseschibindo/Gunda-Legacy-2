-- SUPABASE SETUP GUIDE for Progress Hub Tetu
-- 1. Open your Supabase Project Dashboard
-- 2. Go to the "SQL Editor" tab
-- 3. Paste and run the following code to initialize your database

-- 0. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Tables

-- Profiles table (stores user metadata)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  profile_picture TEXT,
  is_suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contributions table (stores savings/payments)
CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App Settings table (key-value store for app config)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'coming-soon' CHECK (status IN ('done', 'coming-soon', 'planned')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  impact_metric TEXT DEFAULT '0',
  growth_metric TEXT DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Images table (additional photos for projects)
CREATE TABLE IF NOT EXISTS project_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media table (general group gallery)
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  type TEXT DEFAULT 'photo' CHECK (type IN ('photo', 'video')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  reactions JSONB DEFAULT '{}'::jsonb
);

-- 2. Enable Row Level Security (RLS)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- CONTRIBUTIONS
CREATE POLICY "Everyone can view all contributions" ON contributions FOR SELECT USING (true);
CREATE POLICY "Users can insert their own contributions" ON contributions FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = profile_id);
CREATE POLICY "Admins can manage all contributions" ON contributions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- SETTINGS
CREATE POLICY "Settings are viewable by everyone" ON settings FOR SELECT USING (true);

-- PROJECTS & IMAGES
CREATE POLICY "Projects are viewable by everyone" ON projects FOR SELECT USING (true);
CREATE POLICY "Project images are viewable by everyone" ON project_images FOR SELECT USING (true);

-- MEDIA
CREATE POLICY "Media is viewable by everyone" ON media FOR SELECT USING (true);

-- NOTIFICATIONS
CREATE POLICY "Notifications are viewable by everyone" ON notifications FOR SELECT USING (true);

-- 4. Initial Seed Data

INSERT INTO settings (key, value) VALUES 
('app_name', 'Progress Hub Tetu'),
('app_slogan', 'Secure Your Future, Together'),
('share_value', '25'),
('launch_date', '2026-04-06'),
('weekly_motivation', 'Small steps lead to big changes. Keep saving!')
ON CONFLICT (key) DO NOTHING;

-- 5. Storage Setup (Run these manually or via UI)
-- Create a public bucket named 'profiles' in Supabase Storage.

-- 6. Promote yourself to Admin
-- Register an account in the app first, then find your UUID in the 'auth.users' table
-- and run the following command replacing 'YOUR_UUID' with your actual ID:
-- UPDATE profiles SET role = 'admin' WHERE id = 'YOUR_UUID';
