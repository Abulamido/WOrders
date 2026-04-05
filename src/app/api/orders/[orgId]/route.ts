import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET — List orders for an organization (with optional status filter).
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const start = searchParams.get("start");
    const limit = parseInt(searchParams.get("limit") || "200", 10);

    let query = supabase
        .from("orders")
        .select("*, customers(name, phone)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (status) {
        query = query.eq("status", status);
    }

    if (start) {
        query = query.gte("created_at", start);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data });
}

/**
 * PATCH — Update order status.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
        return NextResponse.json(
            { error: "orderId and status are required" },
            { status: 400 }
        );
    }

    const validStatuses = ["pending", "preparing", "ready", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
        return NextResponse.json(
            { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
            { status: 400 }
        );
    }

    const { data: order, error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId)
        .eq("org_id", orgId)
        .select("*, organizations(name)")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send notification to customer on status change
    if (order && (status === "preparing" || status === "ready" || status === "completed")) {
        const orgName = order.organizations?.name || "the restaurant";
        const shortId = order.id.slice(0, 8);

        if (order.telegram_chat_id) {
            // --- Telegram order: notify via Telegram ---
            const { sendMessage } = await import("@/lib/telegram-sender");
            const statusMessages: Record<string, string> = {
                preparing: `👨‍🍳 *Your order from ${orgName} is being prepared!* We'll let you know when it's ready.`,
                ready: `✅ *Your order is ready for pickup!* Come get it while it's hot! 🍔🍟`,
                completed: `🎉 *Your order from ${orgName} is complete!* Enjoy your meal!`,
            };
            await sendMessage(order.telegram_chat_id as unknown as string, statusMessages[status]).catch(console.error);
        } else if (order.customer_phone) {
            // --- WhatsApp order: notify via Green API ---
            const { sendTextMessage } = await import("@/lib/whatsapp-sender");
            const statusMessages: Record<string, string> = {
                preparing: `👨‍🍳 *Good news!* ${orgName} has started preparing your order (#${shortId}). We'll let you know when it's ready!`,
                ready: `📦 *Your order (#${shortId}) from ${orgName} is ready!* ${order.order_type === 'delivery' ? "It's on its way!" : "Come pick it up!"}`,
                completed: `✅ *Your order (#${shortId}) from ${orgName} is complete!* Enjoy your meal! 🍽️`,
            };
            await sendTextMessage(order.customer_phone, statusMessages[status]).catch(console.error);
        }
    }

    return NextResponse.json({ order });
}
