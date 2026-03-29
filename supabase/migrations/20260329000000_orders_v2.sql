-- Recreate orders table for multi-tenancy and advanced features
DROP TABLE IF EXISTS orders CASCADE;

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    telegram_chat_id BIGINT,
    telegram_message_id BIGINT,
    
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    subtotal NUMERIC NOT NULL DEFAULT 0.0,
    tax_amount NUMERIC NOT NULL DEFAULT 0.0,
    delivery_fee NUMERIC NOT NULL DEFAULT 0.0,
    total_amount NUMERIC NOT NULL DEFAULT 0.0,
    
    status TEXT NOT NULL DEFAULT 'pending',          -- pending, accepted, rejected, completed
    payment_status TEXT NOT NULL DEFAULT 'pending',  -- pending, paid, cash_on_pickup
    
    order_type TEXT NOT NULL DEFAULT 'pickup',       -- pickup, delivery
    delivery_address TEXT,
    payment_method TEXT NOT NULL DEFAULT 'online',   -- online, cash
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(org_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_telegram_chat_id ON orders(telegram_chat_id);
