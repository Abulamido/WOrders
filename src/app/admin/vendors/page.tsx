"use client";

import { useEffect, useState } from "react";
import { Loader2, Store, Search, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { getAdminVendors, toggleAdminVendorStatus } from "../actions";

export default function VendorsPage() {
    const [loading, setLoading] = useState(true);
    const [vendors, setVendors] = useState<any[]>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchVendors();
    }, []);

    async function fetchVendors() {
        try {
            const data = await getAdminVendors();
            setVendors(data);
        } catch (err) {
            console.error("Failed to fetch vendors", err);
        } finally {
            setLoading(false);
        }
    }

    async function toggleVendorStatus(id: string, currentStatus: boolean) {
        // Optimistic update
        setVendors(vendors.map(v => v.id === id ? { ...v, is_active: !currentStatus } : v));

        try {
            await toggleAdminVendorStatus(id, !currentStatus);
        } catch (err) {
            console.error("Failed to update status", err);
            fetchVendors(); // Revert on error
        }
    }

    const filteredVendors = vendors.filter(v =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        (v.notification_phone && v.notification_phone.includes(search)) ||
        (v.whatsapp_number && v.whatsapp_number.includes(search))
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Loading vendors...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Store className="text-blue-400" size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">All Vendors</h1>
                        <p className="text-sm text-gray-400">Manage cafeteria onboarding and status</p>
                    </div>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#141420] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500/50"
                    />
                </div>
            </div>

            <div className="bg-[#141420] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Restaurant</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined Date</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredVendors.map((vendor) => (
                                <tr key={vendor.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-4">
                                        <div className="font-semibold text-white">{vendor.name}</div>
                                        <div className="text-xs text-gray-500 font-mono mt-1">ID: {vendor.id.slice(0, 8)}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm text-gray-300">
                                            {vendor.notification_telegram_id ? `TG: ${vendor.notification_telegram_id}` : (vendor.notification_phone || vendor.whatsapp_number || "No contact")}
                                        </div>
                                        <div className="text-xs text-gray-500">{vendor.slug}</div>
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
                                                <CheckCircle2 size={12} /> Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                                <XCircle size={12} /> Disabled
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => toggleVendorStatus(vendor.id, vendor.is_active)}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${vendor.is_active
                                                ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                                }`}
                                        >
                                            {vendor.is_active ? "Disable" : "Enable"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredVendors.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-gray-500">
                                        <ShieldAlert size={32} className="mx-auto mb-3 opacity-50" />
                                        <p>No vendors found matching your search.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
