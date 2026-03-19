-- Enable pg_hashids extension
CREATE EXTENSION IF NOT EXISTS pg_hashids;

-- Machinery table
CREATE TABLE IF NOT EXISTS machinery (
    machinery_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    external_code TEXT NOT NULL,
    machinery_full_name TEXT NOT NULL,
    machinery_name TEXT,
    machinery_model TEXT,
    machinery_serial_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project table
CREATE TABLE IF NOT EXISTS projects (
    project_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    project_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MachineryLog table
CREATE TABLE IF NOT EXISTS machinery_logs (
    machinery_log_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    machine_id BIGINT REFERENCES machinery(machinery_id) NOT NULL,
    project_id BIGINT REFERENCES projects(project_id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    operator_name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    fuel_liters NUMERIC(10, 2) NOT NULL,
    observations TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_corrected BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Using a 16-character hex alphabet to satisfy pg_hashids minimum length requirement
    hash_id TEXT GENERATED ALWAYS AS (
        id_encode(machinery_log_id, 'secret_salt', 6, '0123456789abcdef')
    ) STORED
);

-- Enable Row Level Security
ALTER TABLE machinery ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE machinery_logs ENABLE ROW LEVEL SECURITY;

-- Allow anyone to select machinery and projects
DROP POLICY IF EXISTS "Public select machinery" ON machinery;
CREATE POLICY "Public select machinery" ON machinery FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public select projects" ON projects;
CREATE POLICY "Public select projects" ON projects FOR SELECT USING (true);

-- Allow anyone to insert machinery_logs
DROP POLICY IF EXISTS "Public insert machinery_logs" ON machinery_logs;
CREATE POLICY "Public insert machinery_logs" ON machinery_logs FOR INSERT WITH CHECK (true);

-- Allow anyone to select/update machinery_logs by hash_id (for the update form)
DROP POLICY IF EXISTS "Public select logs by hash_id" ON machinery_logs;
CREATE POLICY "Public select logs by hash_id" ON machinery_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public update logs by hash_id" ON machinery_logs;
CREATE POLICY "Public update logs by hash_id" ON machinery_logs 
    FOR UPDATE 
    USING (NOT is_completed) 
    WITH CHECK (true);

-- Admin policies (assuming admin is authenticated)
-- More restrictive admin policies can be added later as needed.

-- Explicitly grant access to the public schema and tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE machinery TO anon, authenticated;
GRANT SELECT ON TABLE projects TO anon, authenticated;
GRANT SELECT ON TABLE machinery_logs TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE machinery_logs TO anon, authenticated;
GRANT ALL ON TABLE machinery TO authenticated;
GRANT ALL ON TABLE projects TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
