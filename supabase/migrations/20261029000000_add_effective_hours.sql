-- Migration: Add effective_hours to machinery_logs
-- Timestamp: 20261029000000

-- Add effective_hours column
ALTER TABLE machinery_logs
  ADD COLUMN IF NOT EXISTS effective_hours NUMERIC(10, 2);

COMMENT ON COLUMN machinery_logs.effective_hours IS
  'Pre-computed effective hours for machine-type records: fuel_liters / expected_consumption_rate. NULL for trucks (calculated from shift times) or pre-backfill records.';

-- One-time backfill: only fills records where effective_hours is NULL
UPDATE machinery_logs ml
SET effective_hours = ROUND(
    (ml.fuel_liters / m.expected_consumption_rate)::NUMERIC, 2
  )
FROM machinery m
WHERE ml.machine_id = m.machinery_id
  AND m.machine_type != 'truck'
  AND m.expected_consumption_rate > 0
  AND ml.fuel_liters > 0
  AND ml.effective_hours IS NULL;
