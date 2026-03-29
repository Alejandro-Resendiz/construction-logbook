-- Machinery Depreciation table
CREATE TABLE IF NOT EXISTS machinery_depreciation (
    machinery_id BIGINT PRIMARY KEY REFERENCES machinery(machinery_id) ON DELETE CASCADE,
    optimal_fuel_consumption NUMERIC(10, 2), -- Liters/h
    service_life INTEGER, -- years
    purchase_value NUMERIC(15, 2),
    rescue_value NUMERIC(5, 4), -- stored as decimal (e.g., 0.10 for 10%)
    estimated_depreciation_rate NUMERIC(15, 2), -- optional: stored as MXN/hour
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE machinery_depreciation ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view machinery_depreciation"
ON machinery_depreciation FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage machinery_depreciation"
ON machinery_depreciation FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

-- Trigger for updated_at
-- Reuse the existing function if it exists, otherwise create it.
-- It was created in 20260326000000_maintenance_requests.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_machinery_depreciation_updated_at') THEN
        CREATE TRIGGER update_machinery_depreciation_updated_at
        BEFORE UPDATE ON machinery_depreciation
        FOR EACH ROW
        EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;
