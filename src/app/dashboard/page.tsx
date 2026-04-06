"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
    Power,
    QrCode,
    Copy,
    Share2,
    Check
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
    order_type: string;
    delivery_address: string | null;
    payment_method: string;
    created_at: string;
}

const columns: { status: OrderStatus; label: string; icon: React.ElementType; color: string; bgColor: string }[] = [
    { status: "pending", label: "New", icon: Clock, color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/20" },
    { status: "preparing", label: "Preparing", icon: ChefHat, color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/20" },
    { status: "ready", label: "Ready", icon: Package, color: "text-emerald-400", bgColor: "bg-emerald-500/10 border-emerald-500/20" },
    { status: "completed", label: "Completed", icon: CheckCircle2, color: "text-gray-400", bgColor: "bg-gray-500/10 border-gray-500/20" },
];

export default function OrdersDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [organization, setOrganization] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [copied, setCopied] = useState(false);
    const trackedOrderIds = useRef<Set<string>>(new Set());

    // Enable sound interaction for future use (Audio currently hidden from TS due to SSR issues)
    useEffect(() => {
        const enableSound = () => {
            setSoundEnabled(true);
            window.removeEventListener("click", enableSound);
        };
        window.addEventListener("click", enableSound);
        return () => window.removeEventListener("click", enableSound);
    }, []);

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
                const fetchedOrders = data.orders || [];
                
                // Detect new pending orders for sound alert logic
                if (trackedOrderIds.current.size > 0 && fetchedOrders.length > 0) {
                    const hasNewPending = fetchedOrders.some((o: Order) => 
                        o.status === "pending" && !trackedOrderIds.current.has(o.id)
                    );
                    
                    if (hasNewPending && soundEnabled) {
                        console.log("New order detected!");
                    }
                }

                // Update tracked order IDs
                const newIds = new Set<string>(fetchedOrders.map((o: Order) => o.id));
                trackedOrderIds.current = newIds;
                
                setOrders(fetchedOrders);
            }
        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
        } finally {
            if (isManualRefresh) setRefreshing(false);
            setLoading(false);
        }
    }, [orgId, soundEnabled]);

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
    
    const handleCopyLink = (link: string) => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                        <div className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                            soundEnabled 
                                ? "bg-emerald-500/10 text-emerald-500/60" 
                                : "bg-amber-500/10 text-amber-500 animate-pulse border border-amber-500/20"
                        )}>
                            {soundEnabled ? "🔊 Sound Active" : "🔇 Click to Enable Sound"}
                        </div>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                        Manage incoming orders in real-time
                    </p>
                </div>
                <div className="flex items-center gap-3">
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

            {/* Sharing & Customer Links */}
            {organization && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                    <div className="lg:col-span-2 bg-[#141420] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Share2 size={120} />
                        </div>
                        
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Share2 className="text-emerald-400" size={20} />
                                Share your Menu
                            </h3>
                            <p className="text-gray-400 text-sm mb-6 max-w-md">
                                Customers can order from you directly via WhatsApp or Telegram. 
                                Share your unique links on social media or print the QR code for your counter.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* WhatsApp Connection */}
                                <div className="bg-black/30 border border-emerald-500/10 rounded-2xl p-5 hover:border-emerald-500/30 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                            <Phone size={16} />
                                        </div>
                                        <span className="font-bold text-sm">WhatsApp Ordering</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mb-3">
                                        Customers message your WhatsApp to start ordering.
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleCopyLink(`https://wa.me/${organization.whatsapp_number?.replace(/\D/g, '')}?text=Hi!+I'd+like+to+see+the+menu+for+${encodeURIComponent(organization.name)}`)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg transition-all"
                                        >
                                            {copied ? <Check size={14} /> : <Copy size={14} />}
                                            {copied ? "Copied!" : "Copy Link"}
                                        </button>
                                        <a
                                            href={`https://wa.me/${organization.whatsapp_number?.replace(/\D/g, '')}?text=Hi!+I'd+like+to+see+the+menu+for+${encodeURIComponent(organization.name)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition-all"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                    </div>
                                </div>

                                {/* Telegram Connection */}
                                <div className="bg-black/30 border border-blue-500/10 rounded-2xl p-5 hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                                        </div>
                                        <span className="font-bold text-sm">Telegram Bot</span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mb-3">
                                        Secure, fast ordering via the Telegram bot.
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleCopyLink(`https://t.me/Cafteriaflow_bot?start=${organization.slug}`)}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold rounded-lg transition-all"
                                        >
                                            <Copy size={14} />
                                            Copy Link
                                        </button>
                                        <a
                                            href={`https://t.me/Cafteriaflow_bot?start=${organization.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition-all"
                                        >
                                            <ExternalLink size={14} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#141420] border border-white/5 rounded-2xl p-6 text-center flex flex-col justify-center items-center">
                        <div className="flex items-center gap-2 mb-4 text-gray-400">
                            <QrCode size={18} />
                            <span className="text-sm font-semibold uppercase tracking-wider">WhatsApp QR Code</span>
                        </div>
                        <div className="bg-white p-3 rounded-2xl mb-4 shadow-2xl shadow-emerald-500/10">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://wa.me/${organization.whatsapp_number?.replace(/\D/g, '')}?text=Hi!+I'd+like+to+see+the+menu+for+${encodeURIComponent(organization.name)}`)}&bgcolor=ffffff&color=000000`}
                                alt="WhatsApp QR Code"
                                width={160}
                                height={160}
                                className="block"
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight px-4 font-medium uppercase tracking-tighter">
                            Print this QR and place it on your counter or tables for instant ordering.
                        </p>
                    </div>
                </div>
            )}

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {columns.map((col) => {
                    const Icon = col.icon;
                    const colOrders = orders.filter((o) => o.status === col.status);

                    return (
                        <div key={col.status} className="space-y-3">
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

                            <div className="space-y-3">
                                {colOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="bg-[#141420] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <Link href={`/dashboard/orders/${order.id}`} className="font-mono text-sm font-bold text-white/80 hover:text-emerald-400 transition-colors">
                                                {shortOrderId(order.id)}
                                            </Link>
                                            <span className="text-xs text-gray-500">
                                                {formatRelativeTime(order.created_at)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] font-bold">
                                                {(order.customer_name || "?")[0]}
                                            </div>
                                            <span className="text-sm font-medium">
                                                {order.customer_name || "Customer"}
                                            </span>
                                        </div>

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

                                        <div className="flex flex-col pt-3 border-t border-white/5 gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-sm">
                                                    {formatCurrency(order.total_amount)}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <span className={cn(
                                                        "text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase",
                                                        order.order_type === 'delivery' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                                                    )}>
                                                        {order.order_type === 'delivery' ? '🚚 Delivery' : '🚶 Pick Up'}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase",
                                                        order.payment_method === 'online' ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-500/10 text-gray-500"
                                                    )}>
                                                        {order.payment_method === 'online' ? '💳 Online' : '💵 Cash'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {order.order_type === 'delivery' && order.delivery_address && (
                                                <div className="flex items-start gap-1.5 text-[11px] text-gray-400 bg-black/20 p-2 rounded-lg">
                                                    <Package size={10} className="mt-0.5 shrink-0" />
                                                    <span className="line-clamp-2">{order.delivery_address}</span>
                                                </div>
                                            )}
                                        </div>

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
