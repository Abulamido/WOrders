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
    Send,
    AlertTriangle,
    ExternalLink,
    Power
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
    subtotal: number;
    platform_fee: number;
    total_amount: number;
    status: OrderStatus;
    payment_status: string;
    pickup_time: string | null;
    order_type: string;
    delivery_address: string | null;
    created_at: string;
}

const columns: { status: OrderStatus; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
    { status: "pending", label: "New", icon: Clock, color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/20" },
    { status: "preparing", label: "Preparing", icon: ChefHat, color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20" },
    { status: "ready", label: "Ready", icon: Package, color: "text-emerald-400", bgColor: "bg-emerald-500/10 border-emerald-500/20" },
    { status: "completed", label: "Completed", icon: CheckCircle2, color: "text-gray-400", bgColor: "bg-gray-500/10 border-gray-500/20" },
];

// Demo orders removed — dashboard now shows real Supabase data only

export default function OrdersDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [organization, setOrganization] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Fetch organization first
    useEffect(() => {
        const storedOrgId = localStorage.getItem("cafeteriaflow_org_id");
        if (storedOrgId) {
            setOrgId(storedOrgId);
        }
    }, []);

    // Fetch orders
    const fetchOrders = useCallback(async (isManualRefresh = false) => {
        if (!orgId) return;
        if (isManualRefresh) setRefreshing(true);
        try {
            // Fetch Organization details too
            const orgRes = await fetch(`/api/organizations?id=${orgId}`);
            if (orgRes.ok) {
                const orgData = await orgRes.json();
                setOrganization(orgData);
            }

            const res = await fetch(`/api/orders/${orgId}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
            }
        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
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

    const toggleStoreStatus = async () => {
        if (!orgId || !organization) return;
        
        const newStatus = !organization.is_open_manually;
        
        // Optimistic update
        setOrganization((prev: any) => ({ ...prev, is_open_manually: newStatus }));
        
        try {
            const res = await fetch("/api/organizations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orgId, is_open_manually: newStatus })
            });
            
            if (!res.ok) {
                // Revert on failure
                fetchOrders();
            }
        } catch (err) {
            console.error("Failed to toggle store status:", err);
            fetchOrders();
        }
    };

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

    // Stats - Professional Financials
    const paidOrders = orders.filter((o) => o.payment_status === "paid");
    const grossRevenue = paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const platformFees = paidOrders.reduce((sum, o) => sum + (Number(o.platform_fee) || 0), 0);
    const netEarnings = grossRevenue - platformFees;

    const activeOrders = orders.filter(
        (o) => o.status !== "completed" && o.status !== "cancelled"
    ).length;

    return (
        <div className="space-y-6">
            {/* Approval Banner */}
            {organization && organization.approval_status !== "approved" && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 animate-in slide-in-from-top-4 duration-500">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="text-amber-500" size={24} />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-amber-500 font-bold">Registration Pending Approval</h3>
                        <p className="text-amber-500/70 text-sm">
                            Your kitchen is currently being reviewed by our administrative team. 
                            Your Telegram menu will be visible to customers once you are approved!
                        </p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">Orders</h1>
                        {organization && (
                            <div className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                                organization.is_open_manually 
                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                                    : "bg-red-500/10 text-red-500 border border-red-500/20"
                            )}>
                                {organization.is_open_manually ? "Open" : "Closed"}
                            </div>
                        )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                        Manage incoming orders in real-time
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Stats pills */}
                    <div className="hidden lg:flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-gray-500 leading-none mb-1">Gross Sales</span>
                            <span className="text-sm font-bold text-white leading-none">{formatCurrency(grossRevenue)}</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-red-400/70 leading-none mb-1">Platform Fee (5%)</span>
                            <span className="text-sm font-bold text-red-400 leading-none">-{formatCurrency(platformFees)}</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-emerald-400/70 leading-none mb-1">Net Earnings</span>
                            <span className="text-lg font-black text-emerald-400 leading-none">{formatCurrency(netEarnings)}</span>
                        </div>
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

                    {/* Connect Telegram Button */}
                    {orgId && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleStoreStatus}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                                    organization?.is_open_manually
                                        ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                                )}
                            >
                                <Power size={16} />
                                <span>{organization?.is_open_manually ? "Close Shop" : "Open Shop"}</span>
                            </button>

                            <a
                                href={`https://t.me/Cafteriaflow_bot?start=vendor_${orgId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0088cc] hover:bg-[#0088cc]/90 text-white text-sm font-bold transition-all shadow-lg shadow-[#0088cc]/10"
                            >
                                <Send size={16} />
                                <span>Connect Telegram</span>
                                <ExternalLink size={12} className="opacity-50" />
                            </a>
                        </div>
                    )}
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
