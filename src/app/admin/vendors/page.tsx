"use client";

import { useEffect, useState } from "react";
import { Loader2, Store, Search, ShieldAlert, CheckCircle2, XCircle, Clock, Percent, ThumbsUp, ThumbsDown, UserCircle } from "lucide-react";
import { getAdminVendors, toggleAdminVendorStatus, updateVendorApprovalStatus, updateVendorPlatformFee } from "../actions";
import { useRouter } from "next/navigation";

export default function VendorsPage() {
    const router = useRouter();
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
        setVendors(vendors.map(v => v.id === id ? { ...v, is_active: !currentStatus } : v));
        try {
            await toggleAdminVendorStatus(id, !currentStatus);
        } catch (err) {
            console.error("Failed to update status", err);
            fetchVendors();
        }
    }

    async function handleApproval(id: string, status: "approved" | "rejected") {
        setVendors(vendors.map(v => v.id === id ? { ...v, approval_status: status } : v));
        try {
            await updateVendorApprovalStatus(id, status);
        } catch (err) {
            console.error("Failed to update approval", err);
            fetchVendors();
        }
    }

    async function handleFeeChange(id: string, fee: string) {
        const numericFee = parseFloat(fee);
        if (isNaN(numericFee)) return;
        
        setVendors(vendors.map(v => v.id === id ? { ...v, platform_fee_percent: numericFee } : v));
        try {
            await updateVendorPlatformFee(id, numericFee);
        } catch (err) {
            console.error("Failed to update fee", err);
            fetchVendors();
        }
    }

    function impersonateVendor(id: string) {
        localStorage.setItem("cafeteriaflow_org_id", id);
        router.push("/dashboard");
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
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan & Fee</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined Date</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Approval</th>
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
                                        <div className="flex flex-col gap-1">
                                            <span className="inline-flex w-fit px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
                                                {vendor.plan || "Starter"}
                                            </span>
                                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                <Percent size={10} />
                                                <input 
                                                    type="number" 
                                                    className="w-10 bg-transparent border-b border-white/10 focus:border-emerald-500 outline-none text-center"
                                                    defaultValue={vendor.platform_fee_percent}
                                                    onBlur={(e) => handleFeeChange(vendor.id, e.target.value)}
                                                />
                                                <span>fee</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-400">
                                        {new Date(vendor.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        {vendor.approval_status === "approved" ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                <CheckCircle2 size={12} /> Approved
                                            </span>
                                        ) : vendor.approval_status === "rejected" ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                                <XCircle size={12} /> Rejected
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                <Clock size={12} /> Pending
                                            </span>
                                        )}
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
                                        <div className="flex flex-col gap-2 items-end">
                                            {vendor.approval_status !== "approved" && (
                                                <button
                                                    onClick={() => handleApproval(vendor.id, "approved")}
                                                    className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                                                >
                                                    <ThumbsUp size={12} /> Approve
                                                </button>
                                            )}
                                            {vendor.approval_status === "pending" && (
                                                <button
                                                    onClick={() => handleApproval(vendor.id, "rejected")}
                                                    className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    <ThumbsDown size={12} /> Reject
                                                </button>
                                            )}
                                            <button
                                                onClick={() => toggleVendorStatus(vendor.id, vendor.is_active)}
                                                className={`text-[10px] uppercase font-bold px-2 py-1 rounded border transition-colors ${vendor.is_active
                                                    ? "bg-red-500/10 text-red-400 border-red-500/10 hover:bg-red-500/20"
                                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/10 hover:bg-emerald-500/20"
                                                    }`}
                                            >
                                                {vendor.is_active ? "Disable" : "Enable"}
                                            </button>

                                            <button
                                                onClick={() => impersonateVendor(vendor.id)}
                                                className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-500 hover:text-white transition-colors"
                                            >
                                                <UserCircle size={12} /> Impersonate
                                            </button>
                                        </div>
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
