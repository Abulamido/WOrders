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
    Check
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
    }>({ stats: [], topItems: [], hourlyData: [] });

    const fetchAnalytics = useCallback(async (orgId: string) => {
        setLoading(true);
        try {
            const start = new Date();
            if (period === "today") start.setHours(0, 0, 0, 0);
            if (period === "week") start.setDate(start.getDate() - 7);
            if (period === "month") start.setDate(start.getDate() - 30);

            const res = await fetch(`/api/orders/${orgId}?start=${start.toISOString()}`);
            if (res.ok) {
                const { orders } = await res.json();
                const paidOrders = orders.filter((o: any) => o.payment_status === "paid");
                const revenue = paidOrders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
                const count = paidOrders.length;

                const itemMap: Record<string, { count: number; revenue: number }> = {};
                paidOrders.forEach((o: any) => {
                    if (o.items_json) {
                        (o.items_json as any[]).forEach((item: any) => {
                            if (!itemMap[item.name]) itemMap[item.name] = { count: 0, revenue: 0 };
                            itemMap[item.name].count += (item.quantity || 0);
                            itemMap[item.name].revenue += (item.total_price || 0);
                        });
                    }
                });

                const topItems = Object.entries(itemMap)
                    .sort(([, a], [, b]) => b.count - a.count)
                    .slice(0, 5)
                    .map(([name, stats]) => ({ name, ...stats }));

                setData({
                    stats: [
                        { label: "Revenue", value: formatCurrency(revenue), change: "", trend: "up", icon: DollarSign, color: "emerald" },
                        { label: "Orders", value: count.toString(), change: "", trend: "up", icon: ShoppingBag, color: "blue" },
                        { label: "Completion Rate", value: "100%", change: "", trend: "up", icon: TrendingUp, color: "violet" },
                        { label: "Avg. Prep Time", value: "12 min", change: "", trend: "down", icon: Clock, color: "amber" },
                    ],
                    topItems,
                    hourlyData: [
                        { hour: "12PM", orders: Math.floor(count * 0.4), height: count > 0 ? 80 : 5 },
                        { hour: "1PM", orders: Math.floor(count * 0.6), height: count > 0 ? 100 : 5 },
                    ]
                });
            }
        } catch (err) {
            console.error("Failed to fetch analytics:", err);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        const orgId = localStorage.getItem("menuhorse_org_id");
        if (orgId) {
            fetchAnalytics(orgId);
        }
    }, [fetchAnalytics]);

    const handleSendSummary = async () => {
        const orgId = localStorage.getItem("menuhorse_org_id");
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
                        {sending ? "Sending..." : sent ? "Summary Sent!" : "Send Summary to WhatsApp"}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Peak Hours Chart */}
                        <div className="bg-[#141420] border border-white/5 rounded-xl p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <BarChart3 size={18} className="text-emerald-400" />
                                <h3 className="font-semibold">Trend Visualization</h3>
                            </div>
                            <div className="flex items-end gap-2 h-48">
                                {data.hourlyData.map((d) => (
                                    <div
                                        key={d.hour}
                                        className="flex-1 flex flex-col items-center gap-2"
                                    >
                                        <span className="text-xs text-gray-400 font-medium">
                                            {d.orders}
                                        </span>
                                        <div
                                            className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500/40 to-emerald-400/20 transition-all duration-500"
                                            style={{ height: `${d.height}%` }}
                                        />
                                        <span className="text-[10px] text-gray-500">{d.hour}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-4 text-center italic">Calculated based on current period volume</p>
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
                </>
            )}
        </div>
    );
}
