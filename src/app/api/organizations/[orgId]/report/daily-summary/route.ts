import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { sendTextMessage } from "@/lib/whatsapp-sender";
import { formatCurrency } from "@/lib/utils";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();

    // 1. Get organization
    const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();

    if (!org || !org.notification_phone) {
        return NextResponse.json({ error: "Organization or notification phone not found" }, { status: 404 });
    }

    // 2. Calculate stats for TODAY (since midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("org_id", orgId)
        .eq("payment_status", "paid")
        .gte("created_at", today.toISOString());

    if (!orders || orders.length === 0) {
        return NextResponse.json({ message: "No sales yet today" });
    }

    const totalSales = orders.reduce((sum, o) => sum + o.total_amount, 0);
    const orderCount = orders.length;

    const itemCounts: Record<string, number> = {};
    orders.forEach(o => {
        (o.items_json as any[]).forEach(item => {
            itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
        });
    });

    const topItems = Object.entries(itemCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, qty]) => `• ${name} (${qty})`)
        .join("\n");

    const summaryMsg = `📊 *Live Sales Summary: ${org.name}*\n(Today so far)\n\n💰 Total Sales: ${formatCurrency(totalSales)}\n📦 Orders: ${orderCount}\n\n🔝 Top Items:\n${topItems || "None"}\n\n_Generated from your dashboard_ 📈`;

    try {
        await sendTextMessage(org.notification_phone, summaryMsg);
        return NextResponse.json({ message: "Summary sent to WhatsApp" });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
