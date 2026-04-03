-- ============================================================
-- Migration: White-Label Agency Support
-- Adds agencies table and links organizations to an agency.
-- ============================================================

-- Agencies table (white-label resellers)
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                          -- "FoodDash Agency"
    slug TEXT UNIQUE NOT NULL,                   -- "fooddash" → subdomain routing
    
    -- Branding
    brand_name TEXT NOT NULL,                    -- Display name shown everywhere
    brand_logo_url TEXT,                         -- Logo URL (optional)
    brand_icon TEXT DEFAULT '🌱',                -- Emoji fallback
    brand_primary_color TEXT DEFAULT '#10b981',  -- Emerald-500
    brand_secondary_color TEXT DEFAULT '#14b8a6',-- Teal-500
    
    -- Config
    custom_domain TEXT,                          -- "orders.fooddash.com"
    telegram_bot_token TEXT,                     -- Agency's own bot token
    telegram_bot_username TEXT,                  -- Agency's own bot username
    support_email TEXT,
    support_phone TEXT,
    
    -- Agency Owner Auth
    owner_name TEXT,
    owner_phone TEXT,
    owner_password TEXT,
    
    -- Status
    plan TEXT DEFAULT 'whitelabel_starter',
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Link organizations to their parent agency (NULL = direct/your brand)
ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_agency_id ON public.organizations(agency_id);
CREATE INDEX IF NOT EXISTS idx_agencies_slug ON public.agencies(slug);
CREATE INDEX IF NOT EXISTS idx_agencies_custom_domain ON public.agencies(custom_domain);

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
