-- Migration: Add machine_types catalog and consumption benchmarks to machinery
-- Timestamp: 20261027000000

-- 1. Create machine_types catalog table
CREATE TABLE IF NOT EXISTS machine_types (
    type_code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial catalog entries
INSERT INTO machine_types (type_code, name, description) VALUES
('machine', 'Máquina', 'Maquinaria pesada de obra (Excavadoras, Retroexcavadoras, etc.)'),
('truck', 'Camión', 'Vehículos de transporte y volteo')
ON CONFLICT (type_code) DO NOTHING;

-- Enable RLS for machine_types
ALTER TABLE machine_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select machine_types" ON machine_types;
CREATE POLICY "Public select machine_types" ON machine_types FOR SELECT USING (true);

-- 2. Add columns to machinery table
ALTER TABLE machinery 
    ADD COLUMN IF NOT EXISTS machine_type TEXT REFERENCES machine_types(type_code) DEFAULT 'machine',
    ADD COLUMN IF NOT EXISTS expected_consumption_hours NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS expected_consumption_liters NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS expected_consumption_rate NUMERIC(10, 2) 
      GENERATED ALWAYS AS (
        CASE WHEN expected_consumption_hours > 0 
             THEN ROUND(expected_consumption_liters / expected_consumption_hours, 2) 
             ELSE 0 
        END
      ) STORED;

COMMENT ON COLUMN machinery.machine_type IS 'Category of machinery (e.g. machine, truck)';
COMMENT ON COLUMN machinery.expected_consumption_hours IS 'Benchmark working hours expected for standard fuel capacity';
COMMENT ON COLUMN machinery.expected_consumption_liters IS 'Benchmark fuel capacity in liters for standard working hours';
COMMENT ON COLUMN machinery.expected_consumption_rate IS 'Dynamic standard rate in Liters per Hour (liters / hours)';
