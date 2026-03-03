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
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function OnboardingFlow() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        whatsapp_number: "",
        notification_phone: "",
        openTime: "08:00",
        closeTime: "18:00"
    });

    const handleNext = () => setStep((s) => s + 1);
    const handlePrev = () => setStep((s) => Math.max(1, s - 1));

    const handleSubmit = async () => {
        setLoading(true);

        // Format business hours
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
                    whatsapp_number: formData.whatsapp_number,
                    notification_phone: formData.notification_phone,
                    business_hours: hours,
                })
            });

            if (res.ok) {
                const resData = await res.json();
                // Store org id for lightweight auth
                localStorage.setItem("cafeteriaflow_org_id", resData.organization.id);

                // Success! The API also creates default categories (Breakfast, Lunch, Drinks, Desserts)
                setStep(4); // Success step
                setTimeout(() => {
                    router.push("/dashboard");
                }, 2000);
            } else {
                console.error("Failed to create organization");
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

                {/* Step 1: Basics */}
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold mb-3">Welcome! Let&apos;s build your menu.</h1>
                            <p className="text-gray-400">First, tell us the name of your cafeteria and the WhatsApp number you will use to accept orders.</p>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Cafeteria Name
                                </label>
                                <div className="relative">
                                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Abu's Campus Café"
                                        className="w-full bg-[#141420] border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Your Personal WhatsApp (for Order Alerts)
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        value={formData.notification_phone}
                                        onChange={(e) => setFormData({ ...formData, notification_phone: e.target.value })}
                                        placeholder="e.g. +1234567891"
                                        className="w-full bg-[#141420] border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    We will send you a WhatsApp message here whenever you get a new order.
                                </p>
                            </div>
                        </div>

                        <div className="pt-8">
                            <button
                                onClick={handleNext}
                                disabled={!formData.name || !formData.whatsapp_number || !formData.notification_phone}
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

                {/* Step 3: Confirmation & Loading */}
                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold mb-3">You&apos;re all set! 🚀</h1>
                            <p className="text-gray-400">Review your details before we create your dashboard.</p>
                        </div>

                        <div className="bg-[#141420] border border-white/5 rounded-2xl p-6 space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-gray-400 text-sm">Cafeteria Name</span>
                                <span className="font-semibold text-right">{formData.name}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-gray-400 text-sm">WhatsApp Number</span>
                                <span className="font-semibold text-right">{formData.whatsapp_number}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/5">
                                <span className="text-gray-400 text-sm">Operating Hours</span>
                                <span className="font-semibold text-right">{formData.openTime} - {formData.closeTime}</span>
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

                {/* Step 4: Success Message */}
                {step === 4 && (
                    <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="text-emerald-400" size={48} />
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                            Cafeteria Created!
                        </h1>
                        <p className="text-gray-400">Taking you to your new dashboard...</p>
                    </div>
                )}
            </main>
        </div>
    );
}
