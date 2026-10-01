-- Add project_id to maintenance_requests
ALTER TABLE maintenance_requests
ADD COLUMN project_id bigint REFERENCES projects(project_id);

-- Backfill project_id from the most recent applicable log
WITH maintenance_requests_by_log AS (
    SELECT
        rq.maintenance_request_id,
        l.project_id
    FROM maintenance_requests rq
    LEFT JOIN LATERAL (
        SELECT
            l.project_id
        FROM machinery_logs l
        WHERE l.machine_id = rq.machine_id
          AND l.date <= rq.date
          AND l.project_id IS NOT NULL
        ORDER BY l.date DESC, l.machinery_log_id DESC
        LIMIT 1
    ) l ON true
    WHERE rq.project_id IS NULL
)
UPDATE maintenance_requests r
SET project_id = tp.project_id
FROM maintenance_requests_by_log tp
WHERE r.maintenance_request_id = tp.maintenance_request_id
  AND tp.project_id IS NOT NULL;