-- Run this in the Supabase SQL editor

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table (mirrors auth.users)
CREATE TABLE public.users (
  id uuid REFERENCES auth.users PRIMARY KEY,
  username text UNIQUE,
  avatar_url text,
  eco_points integer DEFAULT 0,
  badge_ids text[] DEFAULT '{}',
  reports_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Reports table with PostGIS
CREATE TABLE public.reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id),
  category text CHECK (category IN ('wildlife','plant','marine','invasive','habitat_destruction','illegal_dumping','pollution','environmental_emergency')),
  species_name text,
  description text,
  photo_url text,
  location geography(Point,4326),
  location_name text,
  ai_confidence float,
  is_invasive boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  severity text DEFAULT 'low',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Index for spatial queries
CREATE INDEX reports_location_idx ON public.reports USING GIST (location);

-- Alerts table
CREATE TABLE public.alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid REFERENCES public.reports(id),
  alert_type text,
  sent_at timestamptz DEFAULT now(),
  acknowledged boolean DEFAULT false
);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Users: read all, write own
CREATE POLICY "Public profiles are viewable by everyone" ON public.users
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Reports: read all, write own
CREATE POLICY "Reports are viewable by everyone" ON public.reports
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reports" ON public.reports
  FOR UPDATE USING (auth.uid() = user_id);

-- Alerts: service role only (no direct user access)
CREATE POLICY "Service role can manage alerts" ON public.alerts
  USING (false);

-- Storage bucket for report photos
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Report photos are public" ON storage.objects
  FOR SELECT USING (bucket_id = 'reports');
CREATE POLICY "Authenticated users can upload report photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'reports' AND auth.role() = 'authenticated');

-- Enable Realtime on reports table
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;

-- ── Migration: add 4 new threat categories ────────────────────────────────────
-- Run this in the Supabase SQL editor if the reports table already exists:
--
-- ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_category_check;
-- ALTER TABLE public.reports ADD CONSTRAINT reports_category_check
--   CHECK (category IN (
--     'wildlife','plant','marine','invasive',
--     'habitat_destruction','illegal_dumping','pollution','environmental_emergency'
--   ));
