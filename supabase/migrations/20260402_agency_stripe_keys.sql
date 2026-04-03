-- Add independent Stripe API keys to agencies
ALTER TABLE agencies
ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
ADD COLUMN IF NOT EXISTS stripe_webhook_secret TEXT;
