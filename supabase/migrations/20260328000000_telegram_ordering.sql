-- Add Telegram support to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS telegram_id BIGINT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS telegram_username TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- Add Telegram support to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT;

-- Add unique constraint to customers for telegram_id per organization if needed
-- However, we already have UNIQUE(org_id, phone).
-- We might want UNIQUE(org_id, telegram_id) as well.
ALTER TABLE customers ADD CONSTRAINT unique_org_telegram UNIQUE (org_id, telegram_id);

-- Add notification phone/id field to organizations if missing (for vendor alerts)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS notification_telegram_id BIGINT;
