"use client";

import { useState } from "react";
import {
    DollarSign,
    ShoppingBag,
    TrendingUp,
    Clock,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Demo analytics data
const stats = [
    {
        label: "Revenue",
        value: "$1,247.50",
        change: "+23%",
        trend: "up",
        icon: DollarSign,
        color: "emerald",
    },
    {
        label: "Orders",
        value: "64",
        change: "+12%",
        trend: "up",
        icon: ShoppingBag,
        color: "blue",
    },
    {
        label: "Completion Rate",
        value: "97.3%",
        change: "+2.1%",
        trend: "up",
        icon: TrendingUp,
        color: "violet",
    },
    {
        label: "Avg. Prep Time",
        value: "11 min",
        change: "-8%",
        trend: "down",
        icon: Clock,
        color: "amber",
    },
];

const topItems = [
    { name: "Grilled Chicken Burger", count: 28, revenue: 307.72 },
    { name: "Caesar Salad", count: 15, revenue: 112.5 },
    { name: "Iced Coffee", count: 42, revenue: 189.0 },
    { name: "Turkey Club Sandwich", count: 12, revenue: 108.0 },
    { name: "Fresh Lemonade", count: 18, revenue: 63.0 },
    { name: "Chocolate Brownie", count: 9, revenue: 54.0 },
];

const hourlyData = [
    { hour: "8AM", orders: 3, height: 15 },
    { hour: "9AM", orders: 5, height: 25 },
    { hour: "10AM", orders: 4, height: 20 },
    { hour: "11AM", orders: 8, height: 40 },
    { hour: "12PM", orders: 18, height: 90 },
    { hour: "1PM", orders: 20, height: 100 },
    { hour: "2PM", orders: 12, height: 60 },
    { hour: "3PM", orders: 6, height: 30 },
    { hour: "4PM", orders: 4, height: 20 },
    { hour: "5PM", orders: 7, height: 35 },
];

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

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Analytics</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Track your performance and trends
                    </p>
                </div>
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    const colors = colorMap[stat.color];
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
                        <h3 className="font-semibold">Peak Hours</h3>
                    </div>
                    <div className="flex items-end gap-2 h-48">
                        {hourlyData.map((d) => (
                            <div
                                key={d.hour}
                                className="flex-1 flex flex-col items-center gap-2"
                            >
                                <span className="text-xs text-gray-400 font-medium">
                                    {d.orders}
                                </span>
                                <div
                                    className="w-full rounded-t-md bg-gradient-to-t from-emerald-500/60 to-emerald-400/30 transition-all duration-500"
                                    style={{ height: `${d.height}%` }}
                                />
                                <span className="text-[10px] text-gray-500">{d.hour}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Items */}
                <div className="bg-[#141420] border border-white/5 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp size={18} className="text-violet-400" />
                        <h3 className="font-semibold">Top Items</h3>
                    </div>
                    <div className="space-y-3">
                        {topItems.map((item, i) => {
                            const maxCount = Math.max(...topItems.map((t) => t.count));
                            const width = (item.count / maxCount) * 100;
                            return (
                                <div key={item.name} className="space-y-1.5">
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
                                            className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-700"
                                            style={{ width: `${width}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
