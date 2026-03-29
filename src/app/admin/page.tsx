"use client";

import { useEffect, useState } from "react";
import { Store, Users, ShoppingBag, TrendingUp, Loader2, ArrowRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getAdminDashboardStats } from "./actions";
import Link from "next/link";

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalVendors: 0,
        activeVendors: 0,
        totalCustomers: 0,
        totalOrders: 0,
        totalRevenue: 0,
    });
    const [recentVendors, setRecentVendors] = useState<any[]>([]);

    useEffect(() => {
        async function fetchAdminData() {
            try {
                const stats = await getAdminDashboardStats();
                setMetrics({
                    totalVendors: stats.totalVendors,
                    activeVendors: stats.activeVendors,
                    totalCustomers: stats.totalCustomers,
                    totalOrders: stats.totalOrders,
                    totalRevenue: stats.totalRevenue,
                });
                setRecentVendors(stats.recentVendors);
            } catch (err) {
                console.error("Admin data fetch error:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchAdminData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Loading platform metrics...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={formatCurrency(metrics.totalRevenue)}
                    icon={<TrendingUp className="text-emerald-400" size={24} />}
                />
                <StatCard
                    title="Active Vendors"
                    value={`${metrics.activeVendors} / ${metrics.totalVendors}`}
                    icon={<Store className="text-blue-400" size={24} />}
                />
                <StatCard
                    title="Total Customers"
                    value={metrics.totalCustomers.toString()}
                    icon={<Users className="text-violet-400" size={24} />}
                />
                <StatCard
                    title="Paid Orders"
                    value={metrics.totalOrders.toString()}
                    icon={<ShoppingBag className="text-amber-400" size={24} />}
                />
            </div>

            {/* Recent Vendors */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Recent Vendors</h2>
                    <Link href="/admin/vendors" className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                        View All <ArrowRight size={16} />
                    </Link>
                </div>

                <div className="bg-[#141420] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Restaurant</th>
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</th>
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
                                    <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {recentVendors.map((vendor) => (
                                    <tr key={vendor.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4">
                                            <div className="font-semibold text-white">{vendor.name}</div>
                                            <div className="text-sm text-gray-500">{vendor.notification_phone || "No phone"}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
                                                {vendor.plan || "Starter"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-400">
                                            {new Date(vendor.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            {vendor.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Inactive
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {recentVendors.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500">
                                            No vendors onboarded yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
    return (
        <div className="bg-[#141420] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
                    <div className="text-3xl font-bold tracking-tight text-white">{value}</div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300">
                    {icon}
                </div>
            </div>
            {/* Subtle glow effect */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300" />
        </div>
    );
}
