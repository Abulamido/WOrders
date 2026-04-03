import { createServiceClient } from "@/lib/supabase";
import { Copy, Plus, Activity, Ban, CheckCircle, Building2 } from "lucide-react";
import { createAgency } from "../actions";

export default async function AdminAgenciesPage() {
    const supabase = createServiceClient();

    // Fetch all agencies
    const { data: agencies, error } = await supabase
        .from("agencies")
        .select(`
            *,
            organizations:organizations(count)
        `)
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">White-Label Agencies</h2>
                    <p className="text-sm text-gray-400">Manage SaaS resellers and white-label tenants</p>
                </div>
            </div>

            {/* Create Agency Form */}
            <div className="bg-[#141420] border border-white/5 rounded-2xl p-6 mb-8">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Building2 className="text-purple-400" size={18} /> New Agency Partner
                </h3>
                <form action={createAgency} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="col-span-1 border border-white/5 rounded-xl px-4 py-2 bg-[#0a0a0f]">
                         <label className="text-[10px] uppercase font-bold text-gray-500">Agency Name</label>
                         <input type="text" name="name" required placeholder="e.g. Acme Eats" className="w-full bg-transparent outline-none text-sm placeholder:text-gray-600 mt-1" />
                    </div>
                    <div className="col-span-1 border border-white/5 rounded-xl px-4 py-2 bg-[#0a0a0f]">
                         <label className="text-[10px] uppercase font-bold text-gray-500">Slug (Subdomain)</label>
                         <input type="text" name="slug" required placeholder="acme" className="w-full bg-transparent outline-none text-sm placeholder:text-gray-600 mt-1 lowercase" />
                    </div>
                    <div className="col-span-1 border border-white/5 rounded-xl px-4 py-2 bg-[#0a0a0f]">
                         <label className="text-[10px] uppercase font-bold text-gray-500">Owner Name</label>
                         <input type="text" name="ownerName" placeholder="Jane Doe" className="w-full bg-transparent outline-none text-sm placeholder:text-gray-600 mt-1" />
                    </div>
                    <div className="col-span-1 border border-white/5 rounded-xl px-4 py-2 bg-[#0a0a0f]">
                         <label className="text-[10px] uppercase font-bold text-gray-500">Owner Phone</label>
                         <input type="text" name="ownerPhone" placeholder="+1234567890" className="w-full bg-transparent outline-none text-sm placeholder:text-gray-600 mt-1" />
                    </div>
                    <div className="col-span-1 flex items-end">
                         <button type="submit" className="w-full h-[60px] bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                             <Plus size={18} /> Add Agency
                         </button>
                    </div>
                </form>
            </div>

            <div className="bg-[#141420] border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#1a1a2a] text-gray-400 uppercase text-xs border-b border-white/5">
                        <tr>
                            <th className="px-6 py-4 font-medium">Agency Details</th>
                            <th className="px-6 py-4 font-medium">Domain / Bot</th>
                            <th className="px-6 py-4 font-medium">Owner</th>
                            <th className="px-6 py-4 font-medium text-center">Vendors</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium">Joined</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {agencies?.map((agency: any) => (
                            <tr key={agency.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                           <span className="text-xl">{agency.brand_icon || "🌱"}</span>
                                           <span className="font-bold text-white text-base">{agency.brand_name}</span>
                                        </div>
                                        <span className="text-xs text-gray-500 font-mono mt-1">slug: {agency.slug}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1 text-xs">
                                        <span className="text-gray-300 truncate max-w-[200px]">
                                            {agency.custom_domain || `${agency.slug}.cafeteriaflow.com`}
                                        </span>
                                        <span className="text-teal-400 font-medium">
                                            @{agency.telegram_bot_username || "None"}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col text-xs">
                                        <span className="text-gray-300 font-medium">{agency.owner_name || "Unknown"}</span>
                                        <span className="text-gray-500 text-[11px]">{agency.owner_phone || "No phone"}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center justify-center bg-gray-800 text-gray-200 px-3 py-1 rounded-full text-xs font-bold font-mono">
                                        {agency.organizations?.[0]?.count || 0}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {agency.is_active ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                                            <CheckCircle size={12} className="text-emerald-500" /> Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 font-medium">
                                            <Ban size={12} /> Suspended
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                                    {new Date(agency.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {(!agencies || agencies.length === 0) && (
                    <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                        <Building2 size={40} className="mb-4 text-gray-700" />
                        <p>No agencies found.</p>
                        <p className="text-sm mt-1">Create an agency via Supabase to get started.</p>
                    </div>
                )}
            </div>
            {error && (
                <div className="text-red-400 text-sm">{error.message}</div>
            )}
        </div>
    );
}
