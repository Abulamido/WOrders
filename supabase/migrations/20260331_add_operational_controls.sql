-- ============================================================
-- Migration: Operational Controls for MVP
-- Adds store open/close toggle, payout account details,
-- platform_fee on orders, and payout_requests table.
-- ============================================================

-- 1. Store Open/Close Toggle
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS is_open_manually BOOLEAN NOT NULL DEFAULT true;

-- 2. Vendor Payout Account Details (bank info as JSONB)
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS payout_account_details JSONB DEFAULT NULL;

-- 3. Platform fee column on orders (may already exist from app code)
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS platform_fee NUMERIC NOT NULL DEFAULT 0.0;

-- 4. Payout Requests table
CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, rejected
    bank_details JSONB NOT NULL,            -- snapshot of payout_account_details at time of request
    notes TEXT,                             -- admin notes
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_org_id ON payout_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);

-- 5. RLS for payout_requests (service role bypasses, but good practice)
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
