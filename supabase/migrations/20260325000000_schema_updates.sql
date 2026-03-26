-- Add is_rented column to machinery table
ALTER TABLE machinery ADD COLUMN is_rented BOOLEAN DEFAULT FALSE;

-- Update comments for clarity
COMMENT ON COLUMN machinery.is_rented IS 'Flag to indicate if the machinery is rented (true) or owned (false)';

-- Add fuel_price column to machinery_logs table
ALTER TABLE machinery_logs ADD COLUMN fuel_price NUMERIC(10, 2);

-- Update comments for clarity
COMMENT ON COLUMN machinery_logs.fuel_price IS 'Price per liter of fuel used in this log entry';
