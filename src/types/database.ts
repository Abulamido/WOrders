/**
 * Database types matching the Supabase schema.
 * These types are used with the Supabase client for type-safe queries.
 */

export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PlanType = "starter" | "growth" | "enterprise";
export type MessageDirection = "incoming" | "outgoing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export interface Organization {
    id: string;
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
    created_at: string;
    updated_at: string;
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
        };
    };
}
