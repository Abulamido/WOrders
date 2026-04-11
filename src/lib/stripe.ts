import Stripe from "stripe";
import { createServiceClient } from "./supabase";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Get the correct Stripe client instance.
 * If the vendor belongs to an agency, use the agency's Stripe key.
 * Otherwise, use the platform's default Stripe key.
 */
export async function getStripeClient(agencyId?: string | null): Promise<Stripe> {
    if (!agencyId) return stripe;

    const supabase = createServiceClient();
    const { data: agency } = await supabase
        .from("agencies")
        .select("stripe_secret_key")
        .eq("id", agencyId)
        .single();

    if (agency?.stripe_secret_key) {
        return new Stripe(agency.stripe_secret_key);
    }

    // Fallback to platform stripe if agency hasn't configured one
    return stripe;
}

/**
 * Create a Stripe Checkout payment link for an order.
 */
export async function createPaymentLink({
    orderId,
    orgName,
    items,
    totalAmount,
    customerPhone,
    agencyId,
}: {
    orderId: string;
    orgName: string;
    items: { name: string; quantity: number; price: number }[];
    totalAmount: number;
    customerPhone: string;
    agencyId?: string | null;
}) {
    const client = await getStripeClient(agencyId);

    const session = await client.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: items.map((item) => ({
            price_data: {
                currency: "ngn",
                product_data: {
                    name: item.name,
                },
                unit_amount: Math.round(item.price * 100), // cents
            },
            quantity: item.quantity,
        })),
        metadata: {
            order_id: orderId,
            customer_phone: customerPhone,
            agency_id: agencyId || "", // Store agency ID for webhook processing
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/success?order_id=${orderId}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/order/cancel?order_id=${orderId}`,
    });

    return session.url;
}

/**
 * Create a Stripe subscription for a cafeteria.
 */
export async function createSubscription({
    email,
    orgId,
    plan,
}: {
    email: string;
    orgId: string;
    plan: "starter" | "growth" | "enterprise";
}) {
    const priceMap = {
        starter: process.env.STRIPE_STARTER_PRICE_ID!,
        growth: process.env.STRIPE_GROWTH_PRICE_ID!,
        enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    };

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer_email: email,
        line_items: [{ price: priceMap[plan], quantity: 1 }],
        metadata: { org_id: orgId, plan },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?setup=complete`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    });

    return session.url;
}
