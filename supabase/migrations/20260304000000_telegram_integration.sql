-- Telegram user subscriptions
CREATE TABLE telegram_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id BIGINT NOT NULL UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    is_active BOOLEAN DEFAULT true,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages log
CREATE TABLE telegram_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id BIGINT,
    chat_id BIGINT,
    user_id UUID,
    message_type TEXT, -- shift_alert, coverage_request, response
    payload JSONB,
    response_data JSONB,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    error_message TEXT
);

-- Note: We need a shifts table to reference if we are to handle shift coverage requests. 
-- For the sake of the migration running without errors, I will create a basic shifts table if it doesn't exist.
CREATE TABLE IF NOT EXISTS shifts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: We need a shift_assignments table
CREATE TABLE IF NOT EXISTS shift_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coverage requests
CREATE TABLE shift_coverage_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_shift_id UUID REFERENCES shifts(id),
    requester_id UUID REFERENCES auth.users(id),
    telegram_message_id UUID,
    status TEXT DEFAULT 'pending', -- pending, covered, cancelled, expired
    potential_coverers UUID[] DEFAULT '{}',
    accepted_by UUID REFERENCES auth.users(id),
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_telegram_chat ON telegram_subscriptions(chat_id);
CREATE INDEX idx_telegram_user ON telegram_subscriptions(user_id);
CREATE INDEX idx_messages_type ON telegram_messages(message_type);
CREATE INDEX idx_coverage_status ON shift_coverage_requests(status);

-- RLS Policies
ALTER TABLE telegram_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own subscription" ON telegram_subscriptions
    FOR SELECT USING (user_id = auth.uid());
