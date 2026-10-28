-- Migration: Make start_time optional in machinery_logs
-- Timestamp: 20261028000000

-- Allow start_time to be null for machinery of type "machine" where hours are calculated from fuel consumption
ALTER TABLE machinery_logs ALTER COLUMN start_time DROP NOT NULL;
