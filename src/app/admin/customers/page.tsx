"use client";

import { useEffect, useState } from "react";
import { Loader2, Users, Search, ShoppingBag } from "lucide-react";
import { getAdminCustomers } from "../actions";
import { formatCurrency } from "@/lib/utils";

export default function CustomersPage() {
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<any[]>([]);
    const [search, setSearch] = useState("");

    useEffect(() => {
        async function fetchCustomers() {
            try {
                // Fetch customers with their related organization
                const data = await getAdminCustomers();
                setCustomers(data);
            } catch (err) {
                console.error("Failed to fetch customers", err);
            } finally {
                setLoading(false);
            }
        }
        fetchCustomers();
    }, []);

    const filteredCustomers = customers.filter(c =>
        (c.phone && c.phone.includes(search)) ||
        (c.organizations?.name && c.organizations.name.toLowerCase().includes(search.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Loading customers...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Users className="text-violet-400" size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">All Customers</h1>
                        <p className="text-sm text-gray-400">View customer base and lifetime value</p>
                    </div>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder="Search by phone or vendor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-[#141420] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-violet-500/50"
                    />
                </div>
            </div>

            <div className="bg-[#141420] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer Info</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Preferred Vendor</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Orders</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Lifetime Value</th>
                                <th className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Engaged</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredCustomers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-4">
                                        <div className="font-semibold text-white">
                                            {customer.telegram_chat_id ? "Telegram Customer" : "Phone User"}
                                        </div>
                                        <div className="text-sm text-gray-400 font-mono mt-1">
                                            {customer.phone.replace("tg:", "ID: ")}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm text-white">{customer.organizations?.name || "Unknown"}</div>
                                        <div className="text-xs text-gray-500">@{customer.organizations?.slug}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-white/5 border border-white/10">
                                            <ShoppingBag size={12} className="text-gray-400" />
                                            {customer.order_count || 0}
                                        </div>
                                    </td>
                                    <td className="p-4 font-semibold text-emerald-400">
                                        {formatCurrency(customer.total_spent || 0)}
                                    </td>
                                    <td className="p-4 text-sm text-gray-400">
                                        {customer.last_order_at ? new Date(customer.last_order_at).toLocaleDateString() : "Never"}
                                    </td>
                                </tr>
                            ))}
                            {filteredCustomers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-500">
                                        <Users size={32} className="mx-auto mb-3 opacity-50 text-violet-400" />
                                        <p>No customers found matching your search.</p>
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
