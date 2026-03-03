"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Clock,
    CheckCircle2,
    ChefHat,
    Package,
    Phone,
    DollarSign,
    RefreshCw,
} from "lucide-react";
import { cn, formatCurrency, formatRelativeTime, shortOrderId } from "@/lib/utils";

type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

interface OrderItem {
    name: string;
    variant?: string;
    quantity: number;
    total_price: number;
}

interface Order {
    id: string;
    customer_phone: string;
    customer_name: string | null;
    items_json: OrderItem[];
    total_amount: number;
    status: OrderStatus;
    payment_status: string;
    pickup_time: string | null;
    created_at: string;
}

const columns: { status: OrderStatus; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
    { status: "pending", label: "New", icon: Clock, color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/20" },
    { status: "preparing", label: "Preparing", icon: ChefHat, color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20" },
    { status: "ready", label: "Ready", icon: Package, color: "text-emerald-400", bgColor: "bg-emerald-500/10 border-emerald-500/20" },
    { status: "completed", label: "Completed", icon: CheckCircle2, color: "text-gray-400", bgColor: "bg-gray-500/10 border-gray-500/20" },
];

// Demo orders for the UI
const demoOrders: Order[] = [
    {
        id: "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
        customer_phone: "+1234567890",
        customer_name: "John D.",
        items_json: [
            { name: "Grilled Chicken Burger", variant: "Large", quantity: 2, total_price: 20.0 },
            { name: "Iced Coffee", quantity: 1, total_price: 4.5 },
        ],
        total_amount: 26.46,
        status: "pending",
        payment_status: "paid",
        pickup_time: new Date(Date.now() + 30 * 60000).toISOString(),
        created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    {
        id: "b2c3d4e5-f6a7-8901-bcde-2345678901bc",
        customer_phone: "+1987654321",
        customer_name: "Sarah K.",
        items_json: [
            { name: "Caesar Salad", quantity: 1, total_price: 8.5 },
            { name: "Sparkling Water", quantity: 1, total_price: 2.5 },
        ],
        total_amount: 11.88,
        status: "pending",
        payment_status: "paid",
        pickup_time: new Date(Date.now() + 15 * 60000).toISOString(),
        created_at: new Date(Date.now() - 8 * 60000).toISOString(),
    },
    {
        id: "c3d4e5f6-a7b8-9012-cdef-3456789012cd",
        customer_phone: "+1122334455",
        customer_name: "Mike R.",
        items_json: [
            { name: "Turkey Club Sandwich", quantity: 1, total_price: 9.0 },
        ],
        total_amount: 9.72,
        status: "preparing",
        payment_status: "paid",
        pickup_time: new Date(Date.now() + 10 * 60000).toISOString(),
        created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    },
    {
        id: "d4e5f6a7-b8c9-0123-defa-4567890123de",
        customer_phone: "+1555666777",
        customer_name: "Lisa M.",
        items_json: [
            { name: "Margherita Pizza", variant: "Regular", quantity: 1, total_price: 12.0 },
            { name: "Garlic Bread", quantity: 1, total_price: 4.0 },
        ],
        total_amount: 17.28,
        status: "ready",
        payment_status: "paid",
        pickup_time: new Date(Date.now() + 5 * 60000).toISOString(),
        created_at: new Date(Date.now() - 20 * 60000).toISOString(),
    },
    {
        id: "e5f6a7b8-c9d0-1234-efab-5678901234ef",
        customer_phone: "+1999888777",
        customer_name: "Alex T.",
        items_json: [
            { name: "Chicken Wrap", quantity: 2, total_price: 16.0 },
            { name: "Lemonade", quantity: 2, total_price: 7.0 },
        ],
        total_amount: 24.84,
        status: "completed",
        payment_status: "paid",
        pickup_time: null,
        created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    },
];

export default function OrdersDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch organization first
    useEffect(() => {
        const storedOrgId = localStorage.getItem("menuhorse_org_id");
        if (storedOrgId) {
            setOrgId(storedOrgId);
        }
    }, []);

    // Fetch orders
    const fetchOrders = useCallback(async (isManualRefresh = false) => {
        if (!orgId) return;
        if (isManualRefresh) setRefreshing(true);
        try {
            const res = await fetch(`/api/orders/${orgId}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
            }
        } catch (err) {
            console.error("Failed to fetch orders:", err);
        } finally {
            if (isManualRefresh) setRefreshing(false);
            setLoading(false);
        }
    }, [orgId]);

    // Initial fetch and polling
    useEffect(() => {
        if (orgId) {
            fetchOrders();
            const interval = setInterval(() => fetchOrders(), 5000); // Poll every 5 seconds for MVP "real-time"
            return () => clearInterval(interval);
        }
    }, [orgId, fetchOrders]);

    const handleStatusChange = useCallback(
        async (orderId: string, newStatus: OrderStatus) => {
            if (!orgId) return;
            // Optimistic update
            setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
            );

            try {
                const res = await fetch(`/api/orders/${orgId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ orderId, status: newStatus }),
                });

                if (!res.ok) {
                    // Revert on failure
                    fetchOrders();
                }
            } catch (err) {
                console.error("Failed to update status:", err);
                fetchOrders();
            }
        },
        [orgId, fetchOrders]
    );

    const handleRefresh = () => {
        fetchOrders(true);
    };

    const nextStatusMap: Record<string, OrderStatus> = {
        pending: "preparing",
        preparing: "ready",
        ready: "completed",
    };

    const nextStatusLabel: Record<string, string> = {
        pending: "Start Preparing",
        preparing: "Mark Ready",
        ready: "Complete",
    };

    // Stats
    const todayRevenue = orders
        .filter((o) => o.payment_status === "paid")
        .reduce((sum, o) => sum + o.total_amount, 0);
    const activeOrders = orders.filter(
        (o) => o.status !== "completed" && o.status !== "cancelled"
    ).length;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Orders</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Manage incoming orders in real-time
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Stats pills */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                        <DollarSign size={14} />
                        <span className="font-medium">{formatCurrency(todayRevenue)}</span>
                        <span className="text-emerald-400/60">today</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                        <Package size={14} />
                        <span className="font-medium">{activeOrders}</span>
                        <span className="text-amber-400/60">active</span>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <RefreshCw
                            size={18}
                            className={cn(
                                "text-gray-400",
                                refreshing && "animate-spin text-emerald-400"
                            )}
                        />
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {columns.map((col) => {
                    const Icon = col.icon;
                    const colOrders = orders.filter((o) => o.status === col.status);

                    return (
                        <div key={col.status} className="space-y-3">
                            {/* Column header */}
                            <div
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border",
                                    col.bgColor
                                )}
                            >
                                <Icon size={16} className={col.color} />
                                <span className={cn("text-sm font-semibold", col.color)}>
                                    {col.label}
                                </span>
                                <span
                                    className={cn(
                                        "ml-auto text-xs font-bold px-2 py-0.5 rounded-full",
                                        col.bgColor,
                                        col.color
                                    )}
                                >
                                    {colOrders.length}
                                </span>
                            </div>

                            {/* Order cards */}
                            <div className="space-y-3">
                                {colOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="bg-[#141420] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
                                    >
                                        {/* Order header */}
                                        <div className="flex items-center justify-between mb-3">
                                            <Link href={`/dashboard/orders/${order.id}`} className="font-mono text-sm font-bold text-white/80 hover:text-emerald-400 transition-colors">
                                                {shortOrderId(order.id)}
                                            </Link>
                                            <span className="text-xs text-gray-500">
                                                {formatRelativeTime(order.created_at)}
                                            </span>
                                        </div>

                                        {/* Customer */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] font-bold">
                                                {(order.customer_name || "?")[0]}
                                            </div>
                                            <span className="text-sm font-medium">
                                                {order.customer_name || "Customer"}
                                            </span>
                                        </div>

                                        {/* Items */}
                                        <div className="space-y-1 mb-3">
                                            {order.items_json.map((item, i) => (
                                                <div
                                                    key={i}
                                                    className="flex justify-between text-sm"
                                                >
                                                    <span className="text-gray-300">
                                                        {item.quantity}x {item.name}
                                                        {item.variant && (
                                                            <span className="text-gray-500 text-xs ml-1">
                                                                ({item.variant})
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-gray-400 font-mono text-xs">
                                                        {formatCurrency(item.total_price)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Total + Pickup */}
                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <span className="font-bold text-sm">
                                                {formatCurrency(order.total_amount)}
                                            </span>
                                            {order.pickup_time && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {new Date(order.pickup_time).toLocaleTimeString(
                                                        "en-US",
                                                        { hour: "numeric", minute: "2-digit" }
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        {/* Action button */}
                                        {nextStatusMap[order.status] && (
                                            <button
                                                onClick={() =>
                                                    handleStatusChange(
                                                        order.id,
                                                        nextStatusMap[order.status]
                                                    )
                                                }
                                                className={cn(
                                                    "w-full mt-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                                                    order.status === "pending" &&
                                                    "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30",
                                                    order.status === "preparing" &&
                                                    "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30",
                                                    order.status === "ready" &&
                                                    "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                                )}
                                            >
                                                {nextStatusLabel[order.status]}
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {colOrders.length === 0 && (
                                    <div className="py-8 text-center text-gray-600 text-sm">
                                        No orders
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
