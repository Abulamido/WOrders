import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * Create a Stripe Checkout payment link for an order.
 */
export async function createPaymentLink({
    orderId,
    orgName,
    items,
    totalAmount,
    customerPhone,
}: {
    orderId: string;
    orgName: string;
    items: { name: string; quantity: number; price: number }[];
    totalAmount: number;
    customerPhone: string;
}) {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: items.map((item) => ({
            price_data: {
                currency: "usd",
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
