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
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let query = supabase
        .from("orders")
        .select("*, customers(name, phone)")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (status) {
        query = query.eq("status", status);
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

    // Send Telegram notification to customer on status change
    if (order && (status === "preparing" || status === "ready")) {
        const { sendMessage } = await import("@/lib/telegram-sender");
        const statusMessages: Record<string, string> = {
            preparing: `👨‍🍳 *Your order from ${order.organizations?.name || "the cafeteria"} is being prepared!* We'll let you know when it's ready.`,
            ready: `✅ *Your order is ready for pickup!* Come get it while it's hot! 🍔🍟`,
        };
        
        const chatId = order.telegram_chat_id;
        if (chatId) {
            await sendMessage(chatId as unknown as string, statusMessages[status]).catch(console.error);
        }
    }

    return NextResponse.json({ order });
}
