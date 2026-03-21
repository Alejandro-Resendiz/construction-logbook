-- 1. Refinements for Machinery Table
ALTER TABLE machinery ADD COLUMN IF NOT EXISTS observations TEXT;

-- Uniqueness for (Name, Model, Serial)
ALTER TABLE machinery DROP CONSTRAINT IF EXISTS unique_machine_identity;
ALTER TABLE machinery ADD CONSTRAINT unique_machine_identity UNIQUE (machinery_name, machinery_model, machinery_serial_code);

-- Uniqueness for External Code
ALTER TABLE machinery DROP CONSTRAINT IF EXISTS unique_external_code;
ALTER TABLE machinery ADD CONSTRAINT unique_external_code UNIQUE (external_code);


-- 2. Refinements for Projects Table
-- Uniqueness for Project Name
ALTER TABLE projects DROP CONSTRAINT IF EXISTS unique_project_name;
ALTER TABLE projects ADD CONSTRAINT unique_project_name UNIQUE (project_name);
