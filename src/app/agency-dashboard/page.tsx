"use client";

import { useEffect, useState } from "react";
import { getAgencyData, updateAgencyBranding } from "./actions";
import { Loader2, Save, Store, Palette, MessagesSquare, Link as LinkIcon, KeyRound, CreditCard, BadgeDollarSign } from "lucide-react";

export default function AgencyDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [agency, setAgency] = useState<any>(null);
    const [vendors, setVendors] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ grossRevenue: 0, totalCommissions: 0, totalOrders: 0 });
    
    // Form state
    const [formData, setFormData] = useState({
        brand_name: "",
        brand_icon: "🌱",
        brand_primary_color: "#10b981",
        brand_secondary_color: "#14b8a6",
        telegram_bot_token: "",
        telegram_bot_username: "",
        custom_domain: "",
        stripe_publishable_key: "",
        stripe_secret_key: "",
        stripe_webhook_secret: "",
        platform_fee_percent: 5.0,
    });

    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        const id = localStorage.getItem("cf_agency_id");
        if (id) {
            getAgencyData(id).then(data => {
                setAgency(data.agency);
                setVendors(data.organizations);
                setStats(data.stats);
                setFormData({
                    brand_name: data.agency.brand_name || "",
                    brand_icon: data.agency.brand_icon || "🌱",
                    brand_primary_color: data.agency.brand_primary_color || "#10b981",
                    brand_secondary_color: data.agency.brand_secondary_color || "#14b8a6",
                    telegram_bot_token: data.agency.telegram_bot_token || "",
                    telegram_bot_username: data.agency.telegram_bot_username || "",
                    custom_domain: data.agency.custom_domain || "",
                    stripe_publishable_key: data.agency.stripe_publishable_key || "",
                    stripe_secret_key: data.agency.stripe_secret_key || "",
                    stripe_webhook_secret: data.agency.stripe_webhook_secret || "",
                    platform_fee_percent: data.agency.platform_fee_percent || 5.0,
                });
                setLoading(false);
            });
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: "", text: "" });

        try {
            await updateAgencyBranding(agency.id, formData);
            setMessage({ type: "success", text: "Branding updated successfully! Refresh the page to see changes." });
        } catch (error: any) {
            setMessage({ type: "error", text: error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex p-10"><Loader2 className="animate-spin text-purple-400" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-300">
                    Welcome back, {agency?.owner_name || agency?.brand_name}
                </h1>
                <p className="text-gray-400 mt-2">Manage your white-label food delivery platform</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[#141420] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-purple-500/20 transition-all">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Store size={80} />
                    </div>
                    <div className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-tighter">Active Vendors</div>
                    <div className="text-3xl font-black text-white">{vendors.length}</div>
                </div>

                <div className="bg-[#141420] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/20 transition-all">
                    <div className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-tighter">Total Orders</div>
                    <div className="text-3xl font-black text-white">{stats.totalOrders}</div>
                </div>

                <div className="bg-[#141420] border border-white/5 rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/20 transition-all">
                    <div className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-tighter">Platform Gross</div>
                    <div className="text-3xl font-black text-white">${stats.grossRevenue.toFixed(2)}</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="text-purple-400/80 text-sm font-medium mb-1 uppercase tracking-tighter">Your Commissions</div>
                    <div className="text-3xl font-black text-purple-400">${stats.totalCommissions.toFixed(2)}</div>
                </div>
            </div>

            {/* Branding Settings */}
            <div className="bg-[#141420] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5 bg-[#1a1a2a]">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Palette className="text-purple-400" size={20} />
                        Branding & Integration
                    </h2>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    {message.text && (
                        <div className={`p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Column 1: Appearance */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Display</h3>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Brand Name</label>
                                <input
                                    type="text"
                                    name="brand_name"
                                    value={formData.brand_name}
                                    onChange={handleChange}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500/50"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Brand Icon (Emoji)</label>
                                <input
                                    type="text"
                                    name="brand_icon"
                                    value={formData.brand_icon}
                                    onChange={handleChange}
                                    maxLength={2}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500/50 text-xl text-center"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Primary Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="color"
                                            name="brand_primary_color"
                                            value={formData.brand_primary_color}
                                            onChange={handleChange}
                                            className="h-10 w-10 rounded cursor-pointer bg-transparent border-0 p-0"
                                        />
                                        <span className="text-sm text-gray-500 font-mono">{formData.brand_primary_color}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Secondary Color</label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="color"
                                            name="brand_secondary_color"
                                            value={formData.brand_secondary_color}
                                            onChange={handleChange}
                                            className="h-10 w-10 rounded cursor-pointer bg-transparent border-0 p-0"
                                        />
                                        <span className="text-sm text-gray-500 font-mono">{formData.brand_secondary_color}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Webhook & Domain */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Technical</h3>
                            
                            <div>
                                <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                    <MessagesSquare size={16} className="text-blue-400" /> Telegram Bot Username
                                </label>
                                <input
                                    type="text"
                                    name="telegram_bot_username"
                                    value={formData.telegram_bot_username}
                                    onChange={handleChange}
                                    placeholder="e.g. MyFoodDashBot"
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500/50"
                                />
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                    <KeyRound size={16} className="text-yellow-400" /> Telegram Bot Token
                                </label>
                                <input
                                    type="password"
                                    name="telegram_bot_token"
                                    value={formData.telegram_bot_token}
                                    onChange={handleChange}
                                    placeholder="Gotten from BotFather"
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500/50 font-mono text-xs"
                                />
                            </div>

                             <div className="md:col-span-1">
                                 <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                     <LinkIcon size={16} className="text-emerald-400" /> Custom Domain
                                 </label>
                                 <input
                                     type="text"
                                     name="custom_domain"
                                     value={formData.custom_domain}
                                     onChange={handleChange}
                                     placeholder="orders.myagency.com"
                                     className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500/50"
                                 />
                             </div>

                             <div className="md:col-span-1">
                                 <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                     <BadgeDollarSign size={16} className="text-emerald-400" /> Vendor Commission (%)
                                 </label>
                                 <input
                                     type="number"
                                     name="platform_fee_percent"
                                     value={formData.platform_fee_percent}
                                     onChange={handleChange}
                                     step="0.1"
                                     min="0"
                                     className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500/50"
                                 />
                             </div>
                        </div>
                    </div>

                    {/* Stripe Configuration */}
                    <div className="pt-6 mt-6 border-t border-white/5 space-y-4">
                         <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                             <CreditCard size={18} className="text-blue-400" /> Payment Processing (Stripe)
                         </h3>
                         <p className="text-xs text-gray-400 mb-4">
                             Connect your own Stripe account to process payments from your vendors' customers directly. 
                         </p>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">Publishable Key</label>
                                 <input
                                     type="text"
                                     name="stripe_publishable_key"
                                     value={formData.stripe_publishable_key}
                                     onChange={handleChange}
                                     placeholder="pk_live_..."
                                     className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500/50 font-mono text-xs"
                                 />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-300 mb-2">Secret Key</label>
                                 <input
                                     type="password"
                                     name="stripe_secret_key"
                                     value={formData.stripe_secret_key}
                                     onChange={handleChange}
                                     placeholder="sk_live_..."
                                     className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500/50 font-mono text-xs"
                                 />
                             </div>
                             <div className="md:col-span-2">
                                 <label className="block text-sm font-medium text-gray-300 mb-2">Webhook Secret</label>
                                 <input
                                     type="password"
                                     name="stripe_webhook_secret"
                                     value={formData.stripe_webhook_secret}
                                     onChange={handleChange}
                                     placeholder="whsec_..."
                                     className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500/50 font-mono text-xs"
                                 />
                                 <p className="text-xs text-gray-500 mt-2">
                                     Point your Stripe Webhook to: <code className="text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded">https://platform.com/api/webhooks/stripe?agency_id={agency?.id}</code>
                                 </p>
                             </div>
                         </div>
                    </div>

                    <div className="pt-6 border-t border-white/5 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Save Settings
                        </button>
                    </div>
                </form>
            </div>
            
            {/* Vendors List Preview */}
            <div className="bg-[#141420] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5 bg-[#1a1a2a] flex items-center justify-between">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Store className="text-emerald-400" size={20} />
                        Your Vendors
                    </h2>
                </div>
                {vendors.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p>No vendors onboarded yet.</p>
                        <p className="text-sm mt-1">Share your agency onboarding link to get started.</p>
                        <div className="mt-4 inline-flex items-center gap-2 text-purple-400 bg-purple-500/10 px-4 py-2 rounded-lg font-mono text-sm border border-purple-500/20">
                            https://{agency?.custom_domain || `${agency?.slug}.cafeteriaflow.com`}/onboarding
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {vendors.map(v => (
                            <div key={v.id} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div>
                                    <h3 className="font-bold text-white">{v.name}</h3>
                                    <p className="text-xs text-gray-500">@{v.slug}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-mono text-gray-400">{v.phone || v.whatsapp_number}</span>
                                    <div className="mt-1">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${v.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {v.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
