-- Migration: Shift Lifecycle, Pauses (JSONB timeseries), and Orphan Shift Auto-closure
-- Timestamp: 20261027010000

-- 1. Add status and pause tracking columns to machinery_logs
ALTER TABLE machinery_logs 
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'started' 
        CHECK (status IN ('started', 'paused', 'completed')),
    ADD COLUMN IF NOT EXISTS pause_events JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS total_paused_minutes INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS auto_closed BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill legacy records: if is_completed is true, mark status as completed
UPDATE machinery_logs 
SET status = 'completed' 
WHERE is_completed = TRUE AND status != 'completed';

COMMENT ON COLUMN machinery_logs.status IS 'Current shift status: started, paused, or completed';
COMMENT ON COLUMN machinery_logs.pause_events IS 'Timeseries JSON array of pause intervals [{paused_at, unpaused_at, duration_minutes, reason, notes}]';
COMMENT ON COLUMN machinery_logs.total_paused_minutes IS 'Aggregated paused duration in minutes for fast query/analytics';
COMMENT ON COLUMN machinery_logs.auto_closed IS 'Flag indicating if the shift was automatically closed due to 8-hour limit';

-- 2. Concurrency Lock: Prevent multiple active (open) shifts for the same machinery item
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_shift_per_machine 
ON machinery_logs (machine_id) 
WHERE (is_completed = FALSE);

-- 3. Stored Procedure for Automatic Orphan Shifts Closure (8 hours hard limit)
CREATE OR REPLACE FUNCTION auto_close_orphan_shifts()
RETURNS INTEGER AS $$
DECLARE
    closed_count INTEGER;
BEGIN
    WITH closed_rows AS (
        UPDATE machinery_logs
        SET 
            is_completed = TRUE,
            status = 'completed',
            auto_closed = TRUE,
            end_time = COALESCE(end_time, (start_time + interval '8 hours')::time),
            observations = TRIM(COALESCE(observations, '') || ' [Cierre automático: límite de 8 horas alcanzado]')
        WHERE 
            is_completed = FALSE 
            AND (created_at + interval '8 hours') < NOW()
        RETURNING machinery_log_id
    )
    SELECT COUNT(*) INTO closed_count FROM closed_rows;
    
    RETURN closed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Schedule pg_cron job if available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'auto_close_orphan_shifts_job',
            '0 * * * *',
            'SELECT auto_close_orphan_shifts()'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron not enabled or permission denied; relying on application-level JIT check.';
END;
$$;
