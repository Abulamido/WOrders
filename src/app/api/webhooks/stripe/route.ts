import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
import { sendTextMessage } from "@/lib/whatsapp-sender";
import Stripe from "stripe";

/**
 * POST — Stripe webhook handler.
 * Handles payment confirmations for orders and subscription events.
 */
export async function POST(req: NextRequest) {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
        return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        console.error("Stripe webhook signature verification failed:", err);
        return NextResponse.json(
            { error: "Invalid signature" },
            { status: 400 }
        );
    }

    const supabase = createServiceClient();

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const orderId = session.metadata?.order_id;
                const customerPhone = session.metadata?.customer_phone;

                if (orderId) {
                    // Update order payment status
                    const { data: order } = await supabase
                        .from("orders")
                        .update({
                            payment_status: "paid",
                            stripe_payment_intent_id: session.payment_intent as string,
                        })
                        .eq("id", orderId)
                        .select("*, organizations(*)")
                        .single();

                    if (order && customerPhone) {
                        // Notify customer
                        await sendTextMessage(
                            customerPhone,
                            `✅ Payment received! Your order is confirmed.\n\n📋 Order ${orderId.slice(0, 6).toUpperCase()}\n⏰ Estimated pickup: ${order.pickup_time ? new Date(order.pickup_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Soon"}\n\nWe'll notify you when it's ready! 🎉`
                        );

                        // Update customer stats
                        await supabase
                            .from("customers")
                            .update({
                                order_count: (order as unknown as { customer_id: string }).customer_id ? undefined : 1,
                                total_spent: order.total_amount,
                                last_order_at: new Date().toISOString(),
                            })
                            .eq("phone", customerPhone)
                            .eq("org_id", order.org_id);
                    }
                }

                // Handle subscription payments
                const orgId = session.metadata?.org_id;
                if (orgId && session.mode === "subscription") {
                    await supabase
                        .from("organizations")
                        .update({
                            stripe_customer_id: session.customer as string,
                            stripe_subscription_id: session.subscription as string,
                            plan: (session.metadata?.plan as string) || "starter",
                        })
                        .eq("id", orgId);
                }
                break;
            }

            case "payment_intent.payment_failed": {
                const intent = event.data.object as Stripe.PaymentIntent;
                const orderId = intent.metadata?.order_id;
                const customerPhone = intent.metadata?.customer_phone;

                if (orderId) {
                    await supabase
                        .from("orders")
                        .update({ payment_status: "failed" })
                        .eq("id", orderId);

                    if (customerPhone) {
                        await sendTextMessage(
                            customerPhone,
                            `❌ Payment failed for your order. Please try again or use a different payment method.`
                        );
                    }
                }
                break;
            }

            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                await supabase
                    .from("organizations")
                    .update({ is_active: false })
                    .eq("stripe_subscription_id", subscription.id);
                break;
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Stripe webhook processing error:", error);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}
