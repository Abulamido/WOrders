"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ArrowLeft, Clock, DollarSign, MapPin, Package, Phone, User, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Order, OrderStatus } from "@/types/database";

export default function OrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const fetchOrder = async () => {
            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .eq("id", orderId)
                .single();

            if (data) {
                setOrder(data as Order);
            }
            setLoading(false);
        };

        if (orderId) {
            fetchOrder();
        }
    }, [orderId, supabase]);

    const handleUpdateStatus = async (newStatus: OrderStatus) => {
        if (!order) return;
        setUpdating(true);
        try {
            const res = await fetch(`/api/orders/${order.org_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: order.id, status: newStatus }),
            });

            if (res.ok) {
                setOrder({ ...order, status: newStatus });
            }
        } catch (err) {
            console.error("Failed to update status:", err);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
                <p className="text-gray-400 mb-6">The order you're looking for doesn't exist or you don't have access.</p>
                <Link href="/dashboard" className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    const statuses: OrderStatus[] = ["pending", "preparing", "ready", "completed"];
    const currentStatusIndex = statuses.indexOf(order.status);

    return (
        <div className="max-w-4xl mx-auto pb-12">
            {/* Header / Nav */}
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold font-mono">Order #{order.id.split('-')[0]}</h1>
                    <p className="text-gray-400 text-sm">{new Date(order.created_at).toLocaleString()}</p>
                </div>

                <div className="ml-auto">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${order.payment_status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                        {order.payment_status.toUpperCase()}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Details */}
                <div className="md:col-span-2 space-y-6">

                    {/* Status Timeline */}
                    <div className="bg-[#141420] border border-white/5 rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <Clock size={18} className="text-blue-400" /> Order Status
                        </h2>

                        <div className="relative">
                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-white/10" />
                            <div className="space-y-6">
                                {statuses.map((status, index) => {
                                    const isCompleted = index <= currentStatusIndex;
                                    const isCurrent = index === currentStatusIndex;

                                    return (
                                        <div key={status} className="relative flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-[#141420] z-10 ${isCompleted ? 'border-emerald-500 text-emerald-500' : 'border-white/10 text-gray-500'
                                                }`}>
                                                {isCompleted ? <CheckCircle2 size={16} /> : <div className="w-2 h-2 rounded-full bg-gray-500" />}
                                            </div>
                                            <div>
                                                <p className={`font-medium capitalize ${isCompleted ? 'text-white' : 'text-gray-500'}`}>
                                                    {status}
                                                </p>
                                                {isCurrent && status !== "completed" && (
                                                    <div className="mt-2 flex gap-2">
                                                        {status === "pending" && (
                                                            <button
                                                                onClick={() => handleUpdateStatus("preparing")}
                                                                disabled={updating}
                                                                className="px-3 py-1 text-sm bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                                                            >
                                                                Start Preparing
                                                            </button>
                                                        )}
                                                        {status === "preparing" && (
                                                            <button
                                                                onClick={() => handleUpdateStatus("ready")}
                                                                disabled={updating}
                                                                className="px-3 py-1 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                                                            >
                                                                Mark as Ready
                                                            </button>
                                                        )}
                                                        {status === "ready" && (
                                                            <button
                                                                onClick={() => handleUpdateStatus("completed")}
                                                                disabled={updating}
                                                                className="px-3 py-1 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                                                            >
                                                                Complete Order
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="bg-[#141420] border border-white/5 rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Package size={18} className="text-violet-400" /> Items
                        </h2>

                        <div className="space-y-4">
                            {order.items_json.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start pb-4 border-b border-white/5 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-semibold">{item.quantity}x {item.name}</p>
                                        {item.variant && (
                                            <p className="text-sm text-gray-400 ml-4">↳ Size/Variant: {item.variant}</p>
                                        )}
                                        {item.modifiers && item.modifiers.length > 0 && (
                                            <p className="text-sm text-gray-400 ml-4">↳ Add-ons: {item.modifiers.join(", ")}</p>
                                        )}
                                    </div>
                                    <span className="font-mono text-gray-300">{formatCurrency(item.total_price)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
                            <div className="flex justify-between text-sm text-gray-400">
                                <span>Subtotal</span>
                                <span>{formatCurrency(order.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-400">
                                <span>Tax</span>
                                <span>{formatCurrency(order.tax_amount)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-white/5">
                                <span>Total</span>
                                <span className="text-emerald-400">{formatCurrency(order.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Customer Info */}
                <div className="space-y-6">
                    <div className="bg-[#141420] border border-white/5 rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <User size={18} className="text-amber-400" /> Customer Details
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Name</p>
                                <p className="font-medium">{order.customer_name || "Guest User"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Phone (WhatsApp)</p>
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-gray-400" />
                                    <p className="font-mono">{order.customer_phone}</p>
                                </div>
                            </div>
                            {order.pickup_time && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Scheduled Pickup</p>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-gray-400" />
                                        <p className="font-medium text-amber-400">
                                            {new Date(order.pickup_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
