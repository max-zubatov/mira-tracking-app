-- Job Application Tracker Schema

-- Drop tables if they exist (for clean re-runs)
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS preferences CASCADE;

-- User preferences table (single-row per user; we use no auth, so just one row)
CREATE TABLE preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Compensation range
  compensation_min INTEGER DEFAULT 0,
  compensation_max INTEGER DEFAULT 300000,
  compensation_fit INTEGER DEFAULT 3 CHECK (compensation_fit BETWEEN 1 AND 5),
  -- Company size
  company_size_values TEXT[] DEFAULT ARRAY['startup','mid-size','enterprise'],
  company_size_fit INTEGER DEFAULT 3 CHECK (company_size_fit BETWEEN 1 AND 5),
  -- Industries
  industry_values TEXT[] DEFAULT ARRAY[]::TEXT[],
  industry_fit INTEGER DEFAULT 3 CHECK (industry_fit BETWEEN 1 AND 5),
  -- Roles
  role_values TEXT[] DEFAULT ARRAY[]::TEXT[],
  role_fit INTEGER DEFAULT 3 CHECK (role_fit BETWEEN 1 AND 5),
  -- Skills
  skill_values TEXT[] DEFAULT ARRAY[]::TEXT[],
  skills_fit INTEGER DEFAULT 3 CHECK (skills_fit BETWEEN 1 AND 5),
  -- Seniority & Location
  seniority_years INTEGER,
  location TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  logo_url TEXT,
  overview TEXT,
  compensation TEXT,
  link TEXT,
  status TEXT DEFAULT 'tracking' CHECK (status IN ('tracking','applied','interview','offer','rejected','archived')),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','ai')),
  fit_score INTEGER CHECK (fit_score BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default preferences row
INSERT INTO preferences (
  compensation_min, compensation_max, compensation_fit,
  company_size_values, company_size_fit,
  industry_values, industry_fit,
  role_values, role_fit,
  skill_values, skills_fit
) VALUES (
  100000, 250000, 3,
  ARRAY['startup','mid-size']::TEXT[], 3,
  ARRAY['Technology','SaaS']::TEXT[], 3,
  ARRAY['Software Engineer','Senior Engineer']::TEXT[], 3,
  ARRAY['TypeScript','React','Node.js']::TEXT[], 3
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_preferences_updated
  BEFORE UPDATE ON preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_jobs_updated
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
