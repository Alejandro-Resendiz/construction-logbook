-- 1. Helper function to get role from JWT
CREATE OR REPLACE FUNCTION public.get_my_role() 
RETURNS text 
LANGUAGE sql STABLE AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'public');
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, anon;

-- 2. Update Projects Policies
DROP POLICY IF EXISTS "Site admins can manage projects" ON projects;
CREATE POLICY "Site admins can manage projects" ON projects
    FOR ALL 
    USING (public.get_my_role() = 'site_admin')
    WITH CHECK (public.get_my_role() = 'site_admin');

-- Allow everyone to see projects (needed for the log form)
DROP POLICY IF EXISTS "Public select projects" ON projects;
CREATE POLICY "Public select projects" ON projects FOR SELECT USING (true);


-- 3. Update Machinery Policies
DROP POLICY IF EXISTS "Site admins can manage machinery" ON machinery;
CREATE POLICY "Site admins can manage machinery" ON machinery
    FOR ALL 
    USING (public.get_my_role() = 'site_admin')
    WITH CHECK (public.get_my_role() = 'site_admin');

-- Allow everyone to see machinery (needed for the log form)
DROP POLICY IF EXISTS "Public select machinery" ON machinery;
CREATE POLICY "Public select machinery" ON machinery FOR SELECT USING (true);


-- 4. Secure Administrative Correction
-- Only residents or site_admins can update logs via the Admin flow
-- Note: The operator update still works via the "Public update logs by hash_id" policy
DROP POLICY IF EXISTS "Admins can correct logs" ON machinery_logs;
CREATE POLICY "Admins can correct logs" ON machinery_logs
    FOR UPDATE
    USING (public.get_my_role() IN ('resident', 'site_admin'))
    WITH CHECK (public.get_my_role() IN ('resident', 'site_admin'));
