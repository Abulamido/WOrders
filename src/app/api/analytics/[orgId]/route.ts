import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET — Analytics data for an organization.
 * Returns today's stats, top items, and hourly breakdown.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();
    const searchParams = req.nextUrl.searchParams;
    const period = searchParams.get("period") || "today";

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
        case "week":
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
            break;
        case "month":
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case "today":
        default:
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
    }

    // Fetch orders in date range
    const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("org_id", orgId)
        .eq("payment_status", "paid")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allOrders = orders || [];

    // Total revenue and order count
    const totalRevenue = allOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalOrders = allOrders.length;
    const completedOrders = allOrders.filter((o) => o.status === "completed").length;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    // Average prep time (time from pending to completed)
    const completedWithTimes = allOrders.filter(
        (o) => o.status === "completed" && o.created_at && o.updated_at
    );
    const avgPrepTimeMin =
        completedWithTimes.length > 0
            ? completedWithTimes.reduce((sum, o) => {
                const created = new Date(o.created_at).getTime();
                const updated = new Date(o.updated_at).getTime();
                return sum + (updated - created) / 60000;
            }, 0) / completedWithTimes.length
            : 0;

    // Top items by volume
    const itemCounts = new Map<string, { name: string; count: number; revenue: number }>();
    for (const order of allOrders) {
        const items = order.items_json as { name: string; quantity: number; total_price: number }[];
        for (const item of items) {
            const existing = itemCounts.get(item.name) || { name: item.name, count: 0, revenue: 0 };
            existing.count += item.quantity;
            existing.revenue += item.total_price;
            itemCounts.set(item.name, existing);
        }
    }
    const topItems = Array.from(itemCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Hourly breakdown (for peak hours graph)
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        orders: 0,
        revenue: 0,
    }));
    for (const order of allOrders) {
        const hour = new Date(order.created_at).getHours();
        hourlyData[hour].orders++;
        hourlyData[hour].revenue += Number(order.total_amount);
    }

    return NextResponse.json({
        summary: {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            totalOrders,
            completedOrders,
            completionRate: Math.round(completionRate * 10) / 10,
            avgPrepTimeMin: Math.round(avgPrepTimeMin * 10) / 10,
        },
        topItems,
        hourlyData: hourlyData.filter((h) => h.orders > 0),
        period,
    });
}
