-- 1. Helper function to get role from JWT
CREATE OR REPLACE FUNCTION public.get_my_role() 
RETURNS text 
LANGUAGE sql STABLE AS $$
  SELECT coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'public');
$$;

-- 2. Consolidate Table Permissions (GRANTs)
-- Ensuring standard roles have base access before RLS applies

-- PUBLIC OPERATORS (anon)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE machinery TO anon;
GRANT SELECT ON TABLE projects TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE machinery_logs TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ADMINS & RESIDENTS (authenticated)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE machinery TO authenticated;
GRANT ALL ON TABLE projects TO authenticated;
GRANT ALL ON TABLE machinery_logs TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- SERVICE ROLE (The Master Key for Server Actions)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;


-- 3. RBAC Row Level Security Policies

-- Projects: Everyone can see, only Admin can manage
DROP POLICY IF EXISTS "Public select projects" ON projects;
CREATE POLICY "Public select projects" ON projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage projects" ON projects;
CREATE POLICY "Admins can manage projects" ON projects
    FOR ALL 
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');


-- Machinery: Everyone can see, only Admin can manage
DROP POLICY IF EXISTS "Public select machinery" ON machinery;
CREATE POLICY "Public select machinery" ON machinery FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage machinery" ON machinery;
CREATE POLICY "Admins can manage machinery" ON machinery
    FOR ALL 
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');


-- Logs Correction: Admins and Residents only
DROP POLICY IF EXISTS "Admins can correct logs" ON machinery_logs;
CREATE POLICY "Admins can correct logs" ON machinery_logs
    FOR UPDATE
    USING (public.get_my_role() IN ('resident', 'admin'))
    WITH CHECK (public.get_my_role() IN ('resident', 'admin'));
