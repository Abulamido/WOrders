"use client";

import { useState, useEffect, useCallback } from "react";
import {
    DollarSign,
    ShoppingBag,
    TrendingUp,
    Clock,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    Share2,
    Check,
    Users
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const colorMap: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
    emerald: {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        border: "border-emerald-500/20",
        gradient: "from-emerald-500 to-teal-600",
    },
    blue: {
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        border: "border-blue-500/20",
        gradient: "from-blue-500 to-cyan-600",
    },
    violet: {
        bg: "bg-violet-500/10",
        text: "text-violet-400",
        border: "border-violet-500/20",
        gradient: "from-violet-500 to-purple-600",
    },
    amber: {
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        border: "border-amber-500/20",
        gradient: "from-amber-500 to-orange-600",
    },
};

export default function AnalyticsDashboard() {
    const [period, setPeriod] = useState<"today" | "week" | "month">("today");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [data, setData] = useState<{
        stats: any[];
        topItems: any[];
        hourlyData: any[];
        ordersByStatus: Record<string, number>;
        channelBreakdown: { whatsapp: number; telegram: number };
    }>({ stats: [], topItems: [], hourlyData: [], ordersByStatus: {}, channelBreakdown: { whatsapp: 0, telegram: 0 } });

    const fetchAnalytics = useCallback(async (orgId: string) => {
        setLoading(true);
        try {
            const start = new Date();
            if (period === "today") start.setHours(0, 0, 0, 0);
            if (period === "week") start.setDate(start.getDate() - 7);
            if (period === "month") start.setDate(start.getDate() - 30);

            const res = await fetch(`/api/orders/${orgId}?start=${start.toISOString()}&limit=500`);
            if (res.ok) {
                const { orders } = await res.json();
                if (!orders || orders.length === 0) {
                    setData({
                        stats: [
                            { label: "Revenue", value: formatCurrency(0), change: "", trend: "up", icon: DollarSign, color: "emerald" },
                            { label: "Total Orders", value: "0", change: "", trend: "up", icon: ShoppingBag, color: "blue" },
                            { label: "Completion Rate", value: "—", change: "", trend: "up", icon: TrendingUp, color: "violet" },
                            { label: "Unique Customers", value: "0", change: "", trend: "up", icon: Users, color: "amber" },
                        ],
                        topItems: [],
                        hourlyData: [],
                        ordersByStatus: {},
                        channelBreakdown: { whatsapp: 0, telegram: 0 },
                    });
                    setLoading(false);
                    return;
                }

                // --- Revenue: count all non-cancelled orders ---
                const activeOrders = orders.filter((o: any) => o.status !== "cancelled");
                const revenue = activeOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
                const totalCount = orders.length;

                // --- Completion rate ---
                const completedCount = orders.filter((o: any) => o.status === "completed").length;
                const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                // --- Unique customers ---
                const uniqueCustomers = new Set(orders.map((o: any) => o.customer_phone).filter(Boolean)).size;

                // --- Orders by status ---
                const ordersByStatus: Record<string, number> = {};
                orders.forEach((o: any) => {
                    ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
                });

                // --- Channel breakdown ---
                const telegramCount = orders.filter((o: any) => o.telegram_chat_id).length;
                const whatsappCount = totalCount - telegramCount;

                // --- Top items ---
                const itemMap: Record<string, { count: number; revenue: number }> = {};
                orders.forEach((o: any) => {
                    if (o.items_json && o.status !== "cancelled") {
                        (o.items_json as any[]).forEach((item: any) => {
                            if (!itemMap[item.name]) itemMap[item.name] = { count: 0, revenue: 0 };
                            itemMap[item.name].count += (item.quantity || 1);
                            itemMap[item.name].revenue += (item.total_price || 0);
                        });
                    }
                });

                const topItems = Object.entries(itemMap)
                    .sort(([, a], [, b]) => b.count - a.count)
                    .slice(0, 5)
                    .map(([name, stats]) => ({ name, ...stats }));

                // --- Hourly breakdown (real data) ---
                const hourlyMap: Record<number, number> = {};
                orders.forEach((o: any) => {
                    const h = new Date(o.created_at).getHours();
                    hourlyMap[h] = (hourlyMap[h] || 0) + 1;
                });

                const maxHourly = Math.max(...Object.values(hourlyMap), 1);
                const hourlyData: any[] = [];

                // Build 24-hour or relevant range
                const hours = Object.keys(hourlyMap).map(Number).sort((a, b) => a - b);
                const minHour = hours.length > 0 ? Math.max(hours[0] - 1, 0) : 8;
                const maxHour = hours.length > 0 ? Math.min(hours[hours.length - 1] + 1, 23) : 22;

                for (let h = minHour; h <= maxHour; h++) {
                    const count = hourlyMap[h] || 0;
                    const label = h === 0 ? "12AM" : h < 12 ? `${h}AM` : h === 12 ? "12PM" : `${h - 12}PM`;
                    hourlyData.push({
                        hour: label,
                        orders: count,
                        height: Math.max((count / maxHourly) * 100, 4),
                    });
                }

                setData({
                    stats: [
                        { label: "Revenue", value: formatCurrency(revenue), change: "", trend: "up", icon: DollarSign, color: "emerald" },
                        { label: "Total Orders", value: totalCount.toString(), change: "", trend: "up", icon: ShoppingBag, color: "blue" },
                        { label: "Completion Rate", value: `${completionRate}%`, change: "", trend: completionRate >= 80 ? "up" : "down", icon: TrendingUp, color: "violet" },
                        { label: "Unique Customers", value: uniqueCustomers.toString(), change: "", trend: "up", icon: Users, color: "amber" },
                    ],
                    topItems,
                    hourlyData,
                    ordersByStatus,
                    channelBreakdown: { whatsapp: whatsappCount, telegram: telegramCount },
                });
            }
        } catch (err) {
            console.error("Failed to fetch analytics:", err);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        const orgId = localStorage.getItem("cafeteriaflow_org_id");
        if (orgId) {
            fetchAnalytics(orgId);
        }
    }, [fetchAnalytics]);

    const handleSendSummary = async () => {
        const orgId = localStorage.getItem("cafeteriaflow_org_id");
        if (!orgId) return;

        setSending(true);
        try {
            const res = await fetch(`/api/organizations/${orgId}/report/daily-summary`, {
                method: "POST",
            });
            if (res.ok) {
                setSent(true);
                setTimeout(() => setSent(false), 3000);
            }
        } catch (err) {
            console.error("Failed to send summary:", err);
        } finally {
            setSending(false);
        }
    };

    const statusColors: Record<string, string> = {
        pending: "bg-amber-500/20 text-amber-400",
        preparing: "bg-blue-500/20 text-blue-400",
        ready: "bg-emerald-500/20 text-emerald-400",
        completed: "bg-gray-500/20 text-gray-400",
        cancelled: "bg-red-500/20 text-red-400",
    };

    return (
        <div className="pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Analytics</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Track your performance and trends
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSendSummary}
                        disabled={sending || sent}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg",
                            sent
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10"
                                : "bg-white/5 hover:bg-white/10 text-white border border-white/10 shadow-black/20"
                        )}
                    >
                        {sending ? <Loader2 size={16} className="animate-spin" /> : sent ? <Check size={16} /> : <Share2 size={16} />}
                        {sending ? "Sending..." : sent ? "Summary Sent!" : "Send Summary to Telegram"}
                    </button>
                    <div className="flex items-center bg-[#141420] rounded-xl border border-white/5 p-1">
                        {(["today", "week", "month"] as const).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    period === p
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "text-gray-400 hover:text-white"
                                )}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin text-emerald-500" size={32} />
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                        {data.stats.map((stat) => {
                            const Icon = stat.icon;
                            const colors = colorMap[stat.color] || colorMap.emerald;
                            return (
                                <div
                                    key={stat.label}
                                    className="bg-[#141420] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-all duration-200"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div
                                            className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                colors.bg
                                            )}
                                        >
                                            <Icon size={20} className={colors.text} />
                                        </div>
                                        {stat.change && (
                                            <div
                                                className={cn(
                                                    "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                                                    stat.trend === "up"
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : "bg-red-500/10 text-red-400"
                                                )}
                                            >
                                                {stat.trend === "up" ? (
                                                    <ArrowUpRight size={12} />
                                                ) : (
                                                    <ArrowDownRight size={12} />
                                                )}
                                                {stat.change}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-2xl font-bold">{stat.value}</p>
                                    <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Channel Breakdown */}
                    <div className="flex gap-4 mb-8">
                        <div className="flex-1 bg-[#141420] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-lg">📱</div>
                            <div>
                                <p className="text-2xl font-bold text-green-400">{data.channelBreakdown.whatsapp}</p>
                                <p className="text-xs text-gray-500">WhatsApp Orders</p>
                            </div>
                        </div>
                        <div className="flex-1 bg-[#141420] border border-white/5 rounded-xl p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-lg">💬</div>
                            <div>
                                <p className="text-2xl font-bold text-blue-400">{data.channelBreakdown.telegram}</p>
                                <p className="text-xs text-gray-500">Telegram Orders</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Peak Hours Chart */}
                        <div className="bg-[#141420] border border-white/5 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <BarChart3 size={18} className="text-emerald-400" />
                                <h3 className="font-semibold">Orders by Hour</h3>
                            </div>
                            {data.hourlyData.length > 0 ? (
                                <div className="flex items-end gap-1 h-48">
                                    {data.hourlyData.map((d) => (
                                        <div
                                            key={d.hour}
                                            className="flex-1 flex flex-col items-center gap-2 group"
                                        >
                                            <span className="text-xs text-gray-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                {d.orders}
                                            </span>
                                            <div
                                                className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500/50 to-emerald-400/20 hover:from-emerald-500/70 hover:to-emerald-400/40 transition-all duration-300 cursor-default"
                                                style={{ height: `${d.height}%` }}
                                            />
                                            <span className="text-[9px] text-gray-500 whitespace-nowrap">{d.hour}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
                                    No order data for this period yet.
                                </div>
                            )}
                        </div>

                        {/* Top Items */}
                        <div className="bg-[#141420] border border-white/5 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <TrendingUp size={18} className="text-violet-400" />
                                <h3 className="font-semibold">Top Items</h3>
                            </div>
                            <div className="space-y-4">
                                {data.topItems.length > 0 ? data.topItems.map((item, i) => {
                                    const maxCount = Math.max(...data.topItems.map((t) => t.count));
                                    const width = (item.count / maxCount) * 100;
                                    return (
                                        <div key={item.name} className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 font-mono w-4">
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-gray-200">{item.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <span className="text-gray-400">{item.count} sold</span>
                                                    <span className="text-emerald-400 font-medium">
                                                        {formatCurrency(item.revenue)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-violet-500/60 to-purple-400/60 rounded-full transition-all duration-700"
                                                    style={{ width: `${width}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="h-40 flex items-center justify-center text-gray-500 text-sm">
                                        No item data available for this period.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Order Status Breakdown */}
                    {Object.keys(data.ordersByStatus).length > 0 && (
                        <div className="bg-[#141420] border border-white/5 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <ShoppingBag size={18} className="text-blue-400" />
                                <h3 className="font-semibold">Order Status Breakdown</h3>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(data.ordersByStatus).map(([status, count]) => (
                                    <div
                                        key={status}
                                        className={cn(
                                            "px-4 py-2.5 rounded-xl text-sm font-medium border border-white/5",
                                            statusColors[status] || "bg-gray-500/20 text-gray-400"
                                        )}
                                    >
                                        <span className="capitalize">{status}</span>
                                        <span className="ml-2 font-bold">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
