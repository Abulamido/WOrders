import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { sendMessage } from "@/lib/telegram-sender";
import { formatCurrency } from "@/lib/utils";

/**
 * GET /api/admin/reports/daily-summary
 * Triggers daily reports for all active organizations.
 * Secure this with an API key in production.
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 1. Get all active organizations with notification Telegram IDs
    const { data: orgs } = await supabase
        .from("organizations")
        .select("*")
        .eq("is_active", true)
        .not("notification_telegram_id", "is", null);

    if (!orgs) return NextResponse.json({ message: "No orgs found" });

    const results = [];

    for (const org of orgs) {
        // 2. Calculate stats for the last 24 hours
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);

        const { data: orders } = await supabase
            .from("orders")
            .select("*")
            .eq("org_id", org.id)
            .eq("payment_status", "paid")
            .gte("created_at", yesterday.toISOString());

        if (!orders || orders.length === 0) {
            results.push({ org: org.name, status: "No sales" });
            continue;
        }

        const totalSales = orders.reduce((sum, o) => sum + o.total_amount, 0);
        const orderCount = orders.length;

        // 3. Find top items
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

        // 4. Send Telegram Summary
        const summaryMsg = `📊 *Daily Sales Summary: ${org.name}*\n\n💰 Total Sales: ${formatCurrency(totalSales)}\n📦 Orders: ${orderCount}\n\n🔝 Top Items:\n${topItems || "None"}\n\n_Keep up the great work!_ 🚀`;

        try {
            await sendMessage(org.notification_telegram_id!, summaryMsg);
            results.push({ org: org.name, status: "Sent" });
        } catch (err: any) {
            results.push({ org: org.name, status: "Error", error: err.message });
        }
    }

    return NextResponse.json({ results });
}
