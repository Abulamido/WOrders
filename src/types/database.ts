/**
 * Database types matching the Supabase schema.
 * These types are used with the Supabase client for type-safe queries.
 */

export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PlanType = "starter" | "growth" | "enterprise";
export type MessageDirection = "incoming" | "outgoing";
export type PayoutStatus = "pending" | "processing" | "completed" | "rejected";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export interface Agency {
    id: string;
    name: string;
    slug: string;
    brand_name: string;
    brand_logo_url: string | null;
    brand_icon: string;
    brand_primary_color: string;
    brand_secondary_color: string;
    custom_domain: string | null;
    telegram_bot_token: string | null;
    telegram_bot_username: string | null;
    stripe_secret_key: string | null;
    stripe_publishable_key: string | null;
    stripe_webhook_secret: string | null;
    platform_fee_percent: number;
    support_email: string | null;
    support_phone: string | null;
    owner_name: string | null;
    owner_phone: string | null;
    plan: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Organization {
    id: string;
    agency_id: string | null;
    name: string;
    slug: string;
    whatsapp_number: string;
    whatsapp_api_token: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    plan: PlanType;
    is_active: boolean;
    business_hours: Record<string, { open: string; close: string }>;
    timezone: string;
    notification_phone: string | null;
    notification_telegram_id: string | null;
    approval_status: "pending" | "approved" | "rejected";
    subscription_status: "active" | "past_due" | "canceled";
    platform_fee_percent: number;
    is_open_manually: boolean;
    payout_account_details: PayoutAccountDetails | null;
    created_at: string;
    updated_at: string;
}

export interface PayoutAccountDetails {
    bank_name: string;
    account_holder: string;
    account_number: string;
    routing_number: string | null;
    bank_type: "checking" | "savings";
    updated_at: string;
}

export interface PayoutRequest {
    id: string;
    org_id: string;
    amount: number;
    status: PayoutStatus;
    bank_details: PayoutAccountDetails;
    notes: string | null;
    requested_at: string;
    processed_at: string | null;
    created_at: string;
}

export interface Category {
    id: string;
    org_id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
}

export interface MenuItem {
    id: string;
    org_id: string;
    category_id: string | null;
    name: string;
    description: string | null;
    price: number;
    cost_price: number | null;
    image_url: string | null;
    is_available: boolean;
    variants: MenuVariant[] | null;
    modifiers: MenuModifier[] | null;
    prep_time_min: number;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface MenuVariant {
    name: string;
    price: number;
}

export interface MenuModifier {
    name: string;
    price: number;
}

export interface Customer {
    id: string;
    org_id: string;
    phone: string;
    name: string | null;
    preferences: Record<string, unknown>;
    order_count: number;
    total_spent: number;
    telegram_id: string | null;
    telegram_chat_id: string | null;
    last_order_at: string | null;
    created_at: string;
}

export interface OrderItem {
    item_id: string;
    name: string;
    variant?: string;
    modifiers?: string[];
    quantity: number;
    unit_price: number;
    total_price: number;
}

export interface Order {
    id: string;
    org_id: string;
    customer_id: string | null;
    customer_phone: string;
    customer_name: string | null;
    items_json: OrderItem[];
    subtotal: number;
    tax_amount: number;
    delivery_fee: number;
    platform_fee: number;
    total_amount: number;
    status: OrderStatus;
    payment_status: PaymentStatus;
    stripe_payment_intent_id: string | null;
    pickup_time: string | null;
    order_type: "pickup" | "delivery";
    delivery_address: string | null;
    payment_method: "online" | "cash";
    telegram_chat_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface WhatsAppLog {
    id: string;
    org_id: string;
    phone: string | null;
    direction: MessageDirection;
    payload: Record<string, unknown>;
    status: string | null;
    created_at: string;
}

// Supabase Database type for typed client
export interface Database {
    public: {
        Tables: {
            agencies: {
                Row: Agency;
                Insert: Partial<Agency>;
                Update: Partial<Agency>;
            };
            organizations: {
                Row: Organization;
                Insert: Partial<Organization>;
                Update: Partial<Organization>;
            };
            categories: {
                Row: Category;
                Insert: Partial<Category>;
                Update: Partial<Category>;
            };
            menu_items: {
                Row: MenuItem;
                Insert: Partial<MenuItem>;
                Update: Partial<MenuItem>;
            };
            customers: {
                Row: Customer;
                Insert: Partial<Customer>;
                Update: Partial<Customer>;
            };
            orders: {
                Row: Order;
                Insert: Partial<Order>;
                Update: Partial<Order>;
            };
            whatsapp_logs: {
                Row: WhatsAppLog;
                Insert: Partial<WhatsAppLog>;
                Update: Partial<WhatsAppLog>;
            };
            payout_requests: {
                Row: PayoutRequest;
                Insert: Partial<PayoutRequest>;
                Update: Partial<PayoutRequest>;
            };
        };
    };
}
