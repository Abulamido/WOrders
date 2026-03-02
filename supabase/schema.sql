-- =================================================================
-- MenuHorse Clone — Database Schema
-- Run this in Supabase SQL Editor to set up the MVP database
-- =================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================
-- 1. Organizations (cafeteria tenants)
-- =================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  whatsapp_number VARCHAR(20) NOT NULL,
  whatsapp_api_token TEXT,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'starter',
  is_active BOOLEAN DEFAULT true,
  business_hours JSONB DEFAULT '{"mon": {"open": "08:00", "close": "18:00"}, "tue": {"open": "08:00", "close": "18:00"}, "wed": {"open": "08:00", "close": "18:00"}, "thu": {"open": "08:00", "close": "18:00"}, "fri": {"open": "08:00", "close": "18:00"}}',
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 2. Menu categories
-- =================================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 3. Menu items
-- =================================================================
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  variants JSONB,       -- [{name: "Regular", price: 8.00}, {name: "Large", price: 10.00}]
  modifiers JSONB,      -- [{name: "Extra cheese", price: 1.00}, {name: "Bacon", price: 2.00}]
  prep_time_min INTEGER DEFAULT 15,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 4. Customers (phone-based)
-- =================================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  preferences JSONB DEFAULT '{}',
  order_count INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_order_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, phone)
);

-- =================================================================
-- 5. Orders
-- =================================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  customer_phone VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255),
  items_json JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',          -- pending, preparing, ready, completed, cancelled
  payment_status VARCHAR(50) DEFAULT 'pending',  -- pending, paid, failed, refunded
  stripe_payment_intent_id VARCHAR(255),
  pickup_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 6. WhatsApp message logs (debugging + audit)
-- =================================================================
CREATE TABLE whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  phone VARCHAR(20),
  direction VARCHAR(10),    -- incoming, outgoing
  payload JSONB,
  status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 7. Vendor OTPs (secure login)
-- =================================================================
CREATE TABLE vendor_otps (
  phone VARCHAR(20) PRIMARY KEY,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- Indexes for performance
-- =================================================================
CREATE INDEX idx_orders_org_status ON orders(org_id, status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_org_phone ON customers(org_id, phone);
CREATE INDEX idx_menu_items_org ON menu_items(org_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_categories_org ON categories(org_id);
CREATE INDEX idx_whatsapp_logs_org ON whatsapp_logs(org_id);

-- =================================================================
-- Enable Row Level Security (RLS) on all tables
-- =================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- RLS Policies — Service role bypasses, dashboard users per org
-- =================================================================

-- Organizations: authenticated users can read their own org
CREATE POLICY "Users can view own org"
  ON organizations FOR SELECT
  USING (auth.uid()::text = id::text);

-- Categories: users can manage categories for their org
CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL
  USING (org_id IN (SELECT id FROM organizations WHERE auth.uid()::text = id::text));

-- Menu items: users can manage items for their org
CREATE POLICY "Users can manage own menu items"
  ON menu_items FOR ALL
  USING (org_id IN (SELECT id FROM organizations WHERE auth.uid()::text = id::text));

-- Orders: users can view/update orders for their org
CREATE POLICY "Users can manage own orders"
  ON orders FOR ALL
  USING (org_id IN (SELECT id FROM organizations WHERE auth.uid()::text = id::text));

-- Customers: users can view customers for their org
CREATE POLICY "Users can view own customers"
  ON customers FOR SELECT
  USING (org_id IN (SELECT id FROM organizations WHERE auth.uid()::text = id::text));

-- WhatsApp logs: users can view logs for their org
CREATE POLICY "Users can view own logs"
  ON whatsapp_logs FOR SELECT
  USING (org_id IN (SELECT id FROM organizations WHERE auth.uid()::text = id::text));

-- =================================================================
-- Auto-update timestamp trigger
-- =================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_menu_items
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
