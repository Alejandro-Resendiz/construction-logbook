-- Migration: Convert expected_consumption_rate to regular column and drop benchmark hours/liters
-- Timestamp: 20261104000000

-- 1. Create a plain numeric column and copy over existing values
ALTER TABLE public.machinery ADD COLUMN IF NOT EXISTS expected_consumption_rate_direct NUMERIC(10, 2);

UPDATE public.machinery 
SET expected_consumption_rate_direct = expected_consumption_rate;

-- 2. Drop the generated column and intermediate benchmark columns
ALTER TABLE public.machinery DROP COLUMN IF EXISTS expected_consumption_rate;
ALTER TABLE public.machinery DROP COLUMN IF EXISTS expected_consumption_hours;
ALTER TABLE public.machinery DROP COLUMN IF EXISTS expected_consumption_liters;

-- 3. Rename the direct column to expected_consumption_rate
ALTER TABLE public.machinery RENAME COLUMN expected_consumption_rate_direct TO expected_consumption_rate;

COMMENT ON COLUMN public.machinery.expected_consumption_rate IS 'Expected fuel consumption rate in Liters per Hour (L/h) for machines';
