"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Store,
    Phone,
    Clock,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Loader2,
    QrCode,
    Copy,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OnboardingFlow() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [orgId, setOrgId] = useState("");
    const [orgSlug, setOrgSlug] = useState("");
    const [copied, setCopied] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        contact_phone: "",
        openTime: "08:00",
        closeTime: "18:00"
    });

    const handleNext = () => setStep((s) => s + 1);
    const handlePrev = () => setStep((s) => Math.max(1, s - 1));

    // Generate the Telegram link for this org
    const telegramUsername = "Cafteriaflow";
    const telegramLink = orgSlug
        ? `https://t.me/${telegramUsername}?start=${orgSlug}`
        : "";

    const handleCopyLink = () => {
        navigator.clipboard.writeText(telegramLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSubmit = async () => {
        setLoading(true);

        const hours = {
            mon: { open: formData.openTime, close: formData.closeTime },
            tue: { open: formData.openTime, close: formData.closeTime },
            wed: { open: formData.openTime, close: formData.closeTime },
            thu: { open: formData.openTime, close: formData.closeTime },
            fri: { open: formData.openTime, close: formData.closeTime },
        };

        try {
            const res = await fetch("/api/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.name,
                    whatsapp_number: formData.contact_phone,
                    notification_phone: formData.contact_phone,
                    business_hours: hours,
                })
            });

            if (res.ok) {
                const resData = await res.json();
                const newOrgId = resData.organization.id;
                const newOrgSlug = resData.organization.slug;
                setOrgId(newOrgId);
                setOrgSlug(newOrgSlug);

                localStorage.setItem("cafeteriaflow_org_id", newOrgId);
                localStorage.setItem("cafeteriaflow_org_name", formData.name);

                localStorage.setItem("cafeteriaflow_org_slug", newOrgSlug);
                setStep(4); // Success step with Telegram link + QR
            } else {
                const errData = await res.json();
                console.error("Failed to create organization:", errData);
                setLoading(false);
            }
        } catch (err) {
            console.error("Error creating organization:", err);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col pt-12 pb-20 px-6">
            {/* Header */}
            <header className="flex items-center justify-center gap-3 mb-16">
                <span className="text-3xl">🌱</span>
                <span className="font-bold text-2xl bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                    CafeteriaFlow
                </span>
            </header>

            <main className="flex-1 w-full max-w-xl mx-auto flex flex-col justify-center">
                {/* Progress bar */}
                {step < 4 && (
                    <div className="w-full h-1 bg-white/5 rounded-full mb-12 overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                            style={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>
                )}

                {/* Step 1: Restaurant Basics */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold mb-3">Welcome! Let&apos;s set up your restaurant.</h1>
                            <p className="text-gray-400">Customers will order from you via Telegram. No app downloads needed.</p>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Restaurant Name
                                </label>
                                <div className="relative">
                                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Shawarma House, Abu's Café"
                                        className="w-full bg-[#141420] border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Your Phone Number (for login & notifications)
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        type="text"
                                        value={formData.contact_phone}
                                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                                        placeholder="e.g. +1234567890"
                                        className="w-full bg-[#141420] border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    We&apos;ll use this to send you order alerts and for dashboard login.
                                </p>
                            </div>
                        </div>

                        <div className="pt-4">
                            {/* How customers will order you */}
                            <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 mb-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">📱</span>
                                    <span className="text-sm font-semibold text-blue-300">How customers order</span>
                                </div>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    After setup, you&apos;ll get a unique Telegram link and QR code. Share it anywhere — your counter, social media, or menu card. Customers scan it, see your menu, order, and pay instantly.
                                </p>
                            </div>
                        </div>

                        <div>
                            <button
                                onClick={handleNext}
                                disabled={!formData.name || !formData.contact_phone}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                            >
                                Continue <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Hours */}
                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold mb-3">When are you cooking? 👨‍🍳</h1>
                            <p className="text-gray-400">Set your standard operating hours so customers know when they can order.</p>
                        </div>

                        <div className="bg-[#141420] border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <Clock className="text-emerald-400" size={24} />
                                <h2 className="font-semibold text-lg">Standard Hours</h2>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Opening Time</label>
                                    <input
                                        type="time"
                                        value={formData.openTime}
                                        onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all text-white [color-scheme:dark]"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Closing Time</label>
                                    <input
                                        type="time"
                                        value={formData.closeTime}
                                        onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg py-3 px-4 focus:outline-none focus:border-emerald-500/50 transition-all text-white [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-4 text-center">
                                You can customize weekends and holidays later in the dashboard.
                            </p>
                        </div>

                        <div className="pt-8 flex gap-3">
                            <button
                                onClick={handlePrev}
                                className="w-1/3 flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 transition-all font-semibold rounded-xl"
                            >
                                <ChevronLeft size={18} /> Back
                            </button>
                            <button
                                onClick={handleNext}
                                className="w-2/3 flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 transition-all font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                            >
                                Continue <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Confirmation */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold mb-3">You&apos;re all set! 🚀</h1>
                            <p className="text-gray-400">Review your details before we create your dashboard.</p>
                        </div>

                        <div className="bg-[#141420] border border-white/5 rounded-2xl p-6 space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-gray-400 text-sm">Restaurant Name</span>
                                <span className="font-semibold text-right">{formData.name}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-gray-400 text-sm">Contact Phone</span>
                                <span className="font-semibold text-right">{formData.contact_phone}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-gray-400 text-sm">Operating Hours</span>
                                <span className="font-semibold text-right">{formData.openTime} - {formData.closeTime}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-gray-400 text-sm">Ordering Channel</span>
                                <span className="font-semibold text-emerald-400 text-right">📱 Telegram</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-400 text-sm">Starter Menu</span>
                                <span className="font-semibold text-emerald-400 text-right">Auto-generating...</span>
                            </div>
                        </div>

                        <div className="pt-8 flex gap-3">
                            <button
                                onClick={handlePrev}
                                disabled={loading}
                                className="w-1/3 flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-all font-semibold rounded-xl"
                            >
                                <ChevronLeft size={18} /> Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="w-2/3 flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-75 transition-all font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                            >
                                {loading ? (
                                    <><Loader2 size={18} className="animate-spin" /> Setting up...</>
                                ) : (
                                    <>Create Dashboard <ChevronRight size={18} /></>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Success — Show Telegram Link & QR */}
                {step === 4 && (
                    <div className="space-y-8 animate-in zoom-in-95 duration-500">
                        <div className="text-center">
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="text-emerald-400" size={48} />
                            </div>
                            <h1 className="text-3xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent mb-2">
                                {formData.name} is Live! 🎉
                            </h1>
                            <p className="text-gray-400">Share this link with your customers to start receiving orders.</p>
                        </div>

                        {/* Telegram Ordering Link */}
                        <div className="bg-[#141420] border border-emerald-500/20 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-xl">📱</span>
                                <h2 className="font-bold text-lg">Your Ordering Link</h2>
                            </div>

                            <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-4">
                                <code className="text-sm text-emerald-400 break-all">{telegramLink}</code>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleCopyLink}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-sm rounded-xl hover:bg-emerald-500/20 transition-all"
                                >
                                    <Copy size={16} />
                                    {copied ? "Copied!" : "Copy Link"}
                                </button>
                                <a
                                    href={telegramLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold text-sm rounded-xl hover:bg-blue-500/20 transition-all"
                                >
                                    <ExternalLink size={16} />
                                    Open Bot
                                </a>
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="bg-[#141420] border border-white/5 rounded-2xl p-6 text-center">
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <QrCode size={20} className="text-gray-400" />
                                <h3 className="font-semibold">QR Code for your Counter</h3>
                            </div>
                            <div className="bg-white rounded-xl p-4 inline-block mx-auto mb-4">
                                {/* Using a QR code API to generate the code */}
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(telegramLink)}&bgcolor=ffffff&color=000000`}
                                    alt="QR Code for your Telegram ordering link"
                                    width={200}
                                    height={200}
                                    className="block"
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                Print this and place it at your counter. Customers scan → see menu → order → pay.
                            </p>
                        </div>

                        {/* Next Steps */}
                        <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-5">
                            <h3 className="font-semibold text-sm text-violet-300 mb-3">📋 Next Steps</h3>
                            <ol className="space-y-2 text-sm text-gray-400">
                                <li className="flex items-start gap-2">
                                    <span className="text-violet-400 font-bold">1.</span>
                                    Go to <span className="text-white">Menu Builder</span> and add your items with prices
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-violet-400 font-bold">2.</span>
                                    Print or share the QR code / Telegram link with customers
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-violet-400 font-bold">3.</span>
                                    Orders will appear in your <span className="text-white">Dashboard</span> in real-time
                                </li>
                            </ol>
                        </div>

                        <button
                            onClick={() => router.push("/dashboard")}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            Go to Dashboard →
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
