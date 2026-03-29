"use client";

import { useEffect, useState } from "react";
import { Store, Users, ShoppingBag, TrendingUp, Loader2, ArrowRight, UserCircle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { getAdminDashboardStats } from "./actions";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalVendors: 0,
        activeVendors: 0,
        pendingApprovals: 0,
        totalCustomers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalPlatformFees: 0,
    });
    const [recentVendors, setRecentVendors] = useState<any[]>([]);

    useEffect(() => {
        async function fetchAdminData() {
            try {
                const stats = await getAdminDashboardStats();
                setMetrics({
                    totalVendors: stats.totalVendors || 0,
                    activeVendors: stats.activeVendors || 0,
                    pendingApprovals: stats.pendingApprovals || 0,
                    totalCustomers: stats.totalCustomers || 0,
                    totalOrders: stats.totalOrders || 0,
                    totalRevenue: stats.totalRevenue || 0,
                    totalPlatformFees: stats.totalPlatformFees || 0,
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

    function impersonateVendor(id: string) {
        localStorage.setItem("cafeteriaflow_org_id", id);
        router.push("/dashboard");
    }

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
                    title="Platform Revenue (Cut)"
                    value={formatCurrency(metrics.totalPlatformFees)}
                    subtitle="Our 5% share"
                    icon={<TrendingUp className="text-emerald-400" size={24} />}
                    color="emerald"
                />
                <StatCard
                    title="Total Gross Sales"
                    value={formatCurrency(metrics.totalRevenue)}
                    subtitle="Processed thru platform"
                    icon={<ShoppingBag className="text-blue-400" size={24} />}
                    color="blue"
                />
                <StatCard
                    title="Pending Approvals"
                    value={metrics.pendingApprovals.toString()}
                    subtitle="Waiting kitchens"
                    icon={<Users className="text-amber-400" size={24} />}
                    color="amber"
                />
                <StatCard
                    title="Active Vendors"
                    value={`${metrics.activeVendors} / ${metrics.totalVendors}`}
                    subtitle="Approved & operating"
                    icon={<Store className="text-violet-400" size={24} />}
                    color="violet"
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
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recentVendors.map((vendor) => (
                                <tr key={vendor.id} className="hover:bg-white/[0.02] transition-colors group/row">
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
                                        {vendor.approval_status === "approved" ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Approved
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {vendor.approval_status}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => impersonateVendor(vendor.id)}
                                            className="opacity-0 group-hover/row:opacity-100 flex items-center gap-1 ml-auto text-[10px] uppercase font-bold text-gray-400 hover:text-white transition-all"
                                        >
                                            <UserCircle size={14} /> Impersonate
                                        </button>
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

function StatCard({ title, value, subtitle, icon, color }: { title: string; value: string; subtitle?: string; icon: React.ReactNode, color: string }) {
    const colorMap: Record<string, string> = {
        emerald: "bg-emerald-500/5 group-hover:bg-emerald-500/10",
        blue: "bg-blue-500/5 group-hover:bg-blue-500/10",
        amber: "bg-amber-500/5 group-hover:bg-amber-500/10",
        violet: "bg-violet-500/5 group-hover:bg-violet-500/10",
    };

    return (
        <div className="bg-[#141420] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all duration-300">
            <div className="relative z-10 flex items-start justify-between">
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{title}</h3>
                    <div className="text-3xl font-extrabold tracking-tight text-white mb-1">{value}</div>
                    {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
                </div>
                <div className="p-3 bg-white/5 rounded-xl group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300">
                    {icon}
                </div>
            </div>
            {/* Glow effect */}
            <div className={cn("absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-2xl transition-all duration-300", colorMap[color])} />
        </div>
    );
}
