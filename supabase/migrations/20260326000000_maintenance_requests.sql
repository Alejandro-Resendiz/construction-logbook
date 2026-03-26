-- Define Enums
CREATE TYPE maintenance_type_enum AS ENUM ('preventive', 'corrective');
CREATE TYPE maintenance_status_enum AS ENUM ('pending', 'approved', 'rejected');

-- Maintenance Requests Table
CREATE TABLE IF NOT EXISTS maintenance_requests (
    maintenance_request_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    machine_id BIGINT REFERENCES machinery(machinery_id) NOT NULL,
    maintenance_type maintenance_type_enum NOT NULL,
    type maintenance_type_enum NOT NULL, -- Redundant field as requested
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    description TEXT NOT NULL,
    spare_parts JSONB DEFAULT '[]'::jsonb,
    status maintenance_status_enum NOT NULL DEFAULT 'pending',
    is_external BOOLEAN DEFAULT FALSE,
    cost NUMERIC(12, 2) DEFAULT 0,
    worked_time NUMERIC(10, 2) DEFAULT 0, -- hours
    downtime NUMERIC(10, 2) DEFAULT 0,    -- hours
    observations TEXT,
    attachments TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    hash_id TEXT GENERATED ALWAYS AS (
        id_encode(maintenance_request_id, 'maintenance_salt', 8, '0123456789abcdef')
    ) STORED
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_hash_id ON maintenance_requests(hash_id);

-- Enable RLS
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Policies for maintenance_requests
CREATE POLICY "Authenticated users can view maintenance requests"
ON maintenance_requests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create maintenance requests"
ON maintenance_requests FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can update all fields of maintenance requests"
ON maintenance_requests FOR UPDATE
TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Authenticated users can update specific fields of their/all requests"
ON maintenance_requests FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
-- Note: Logic for restricting fields (observations, attachments) will be handled at the application/API layer 
-- unless we use complex RLS with column-level checks or triggers. For simplicity, we'll enforce it in Server Actions.

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_maintenance_requests_updated_at
BEFORE UPDATE ON maintenance_requests
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Storage Setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance_attachments', 'maintenance_attachments', false)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET file_size_limit = 52428800, -- 50MB
    allowed_mime_types = '{image/jpeg,image/png,application/pdf}'
WHERE id = 'maintenance_attachments';

-- Storage Policies
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'maintenance_attachments');

CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'maintenance_attachments');

CREATE POLICY "Admins can delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'maintenance_attachments' AND 
  (public.get_my_role() = 'admin')
);
