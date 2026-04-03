-- Add platform_fee_percent to agencies (for their vendors)
ALTER TABLE agencies
ADD COLUMN IF NOT EXISTS platform_fee_percent NUMERIC DEFAULT 5.0;
