import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { stripe as defaultStripe } from "@/lib/stripe";
import { sendMessage } from "@/lib/telegram-sender";
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

    const { searchParams } = new URL(req.url);
    const agencyId = searchParams.get("agency_id");
    const supabase = createServiceClient();

    let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    let stripeClient = defaultStripe;

    // Multi-tenant: resolving an agency's custom Stripe configuration
    if (agencyId) {
        const { data: agency } = await supabase
            .from("agencies")
            .select("stripe_webhook_secret, stripe_secret_key")
            .eq("id", agencyId)
            .single();
            
        if (agency?.stripe_webhook_secret && agency?.stripe_secret_key) {
            webhookSecret = agency.stripe_webhook_secret;
            stripeClient = new Stripe(agency.stripe_secret_key);
        } else {
            return NextResponse.json({ error: "Agency Stripe configuration incomplete" }, { status: 400 });
        }
    }

    let event: Stripe.Event;

    try {
        event = stripeClient.webhooks.constructEvent(
            body,
            sig,
            webhookSecret
        );
    } catch (err) {
        console.error("Stripe webhook signature verification failed:", err);
        return NextResponse.json(
            { error: "Invalid signature" },
            { status: 400 }
        );
    }

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

                    if (order) {
                        const orgName = order.organizations?.name || "the restaurant";
                        const shortId = order.id.slice(0, 8).toUpperCase();
                        const telegramChatId = order.telegram_chat_id;
                        const customerPhone = order.customer_phone;

                        const orderDetails = `
📋 Order #${shortId}
Type: ${order.order_type === 'delivery' ? '🚚 Delivery' : '🚶 Pick Up'}
${order.delivery_address ? `📍 Address: ${order.delivery_address}\n` : ""}Payment: 💳 Online (Paid)
`.trim();

                        // --- Notify Customer ---
                        const customerMsgFull = `✅ *Payment received!* Your order from *${orgName}* is confirmed.\n\n${orderDetails}\n\nWe'll notify you when it's ready! 🎉`;
                        
                        if (telegramChatId) {
                            await sendMessage(telegramChatId as unknown as string, customerMsgFull).catch(console.error);
                        } else if (customerPhone) {
                            await sendTextMessage(customerPhone, customerMsgFull).catch(console.error);
                        }

                        // --- Notify Vendor ---
                        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://w-orders.vercel.app";
                        const vendorMsgFull = `💰 *New Order Paid!* (#${shortId})\n\n${orderDetails}\n\n🔗 Dashboard: ${appUrl}/dashboard/orders/${order.id}\n\nCheck your dashboard/chat to manage.`;

                        // Telegram Vendor Notify
                        if (order.organizations?.notification_telegram_id) {
                            await sendMessage(order.organizations.notification_telegram_id as unknown as string, vendorMsgFull).catch(console.error);
                        }
                        // WhatsApp Vendor Notify
                        if (order.organizations?.notification_phone) {
                            await sendTextMessage(order.organizations.notification_phone, vendorMsgFull).catch(console.error);
                        }

                        // --- CLEAR CART ---
                        if (customerPhone && order.org_id) {
                            await supabase
                                .from("user_carts")
                                .update({ cart: [], state: "idle" })
                                .eq("phone", customerPhone)
                                .eq("org_id", order.org_id);
                        }

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
                    const { data: order } = await supabase
                        .from("orders")
                        .update({ payment_status: "failed" })
                        .eq("id", orderId)
                        .select("telegram_chat_id")
                        .single();

                    if (order?.telegram_chat_id) {
                        await sendMessage(
                            order.telegram_chat_id as unknown as string,
                            `❌ *Payment failed* for your order. Please try again or use a different payment method.`
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
