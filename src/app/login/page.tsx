"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Store, Phone, ChevronRight, Loader2, KeyRound, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand-context";

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectPath = searchParams.get("redirect") || "/dashboard";
    const brand = useBrand();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [phone, setPhone] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [step, setStep] = useState(1); // 1: Number, 1.5: Select, 1.7: Method, 2: Code
    const [availableOrgs, setAvailableOrgs] = useState<any[]>([]);
    const [availableMethods, setAvailableMethods] = useState<string[]>([]);
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

    const handleSendOTP = async (e?: React.FormEvent, selectedOrgId?: string) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, orgId: selectedOrgId, method: (typeof e === 'string') ? e : undefined }),
            });

            const data = await res.json();

            if (res.ok) {
                if (data.requireSelection) {
                    setAvailableOrgs(data.organizations);
                    setStep(1.5);
                } else if (data.requireMethodSelection) {
                    setAvailableMethods(data.availableMethods);
                    setStep(1.7);
                    if (selectedOrgId) setSelectedOrgId(selectedOrgId);
                } else {
                    setStep(2);
                }
                if (selectedOrgId) setSelectedOrgId(selectedOrgId);
            } else {
                setError(data.error || "Failed to find account");
            }
        } catch (err) {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, code: otpCode, orgId: selectedOrgId }),
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem("cafeteriaflow_org_id", data.orgId);
                if (data.name) localStorage.setItem("cafeteriaflow_org_name", data.name);
                router.push(redirectPath);
            } else {
                const errData = await res.json();
                setError(errData.error || "Invalid verification code");
                setLoading(false);
            }
        } catch (err) {
            setError("Something went wrong");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col pt-12 pb-20 px-6">
            <header className="flex items-center justify-center gap-3 mb-16">
                <span className="text-3xl">{brand.icon}</span>
                <span className="font-bold text-2xl bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
                    {brand.name}
                </span>
            </header>

            <main className="flex-1 w-full max-w-sm mx-auto flex flex-col justify-center">
                {step === 1 ? (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold mb-3">Vendor Login</h1>
                            <p className="text-gray-400">Enter your registered phone number.</p>
                        </div>

                        <form onSubmit={handleSendOTP} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        type="text"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+1234567890"
                                        className="w-full bg-[#141420] border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm"
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm">{error}</p>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={!phone || loading}
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : "Send Login Code"}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : step === 1.5 ? (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                        <button
                            onClick={() => setStep(1)}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-6 transition-colors"
                        >
                            <ArrowLeft size={16} /> Back to number
                        </button>

                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold mb-3">Which restaurant?</h1>
                            <p className="text-gray-400">Multiple kitchens found for this number.</p>
                        </div>

                        <div className="space-y-3">
                            {availableOrgs.map((org) => (
                                <button
                                    key={org.id}
                                    onClick={() => handleSendOTP(undefined, org.id)}
                                    className="w-full flex items-center justify-between p-5 bg-[#141420] hover:bg-[#1a1a2a] border border-white/10 rounded-2xl transition-all group"
                                >
                                    <div className="flex flex-col items-start">
                                        <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                                            {org.name}
                                        </span>
                                        <span className="text-xs text-gray-500">@{org.slug}</span>
                                    </div>
                                    <ChevronRight className="text-gray-600 group-hover:text-emerald-400 transition-colors" size={20} />
                                </button>
                            ))}
                        </div>
                    </div>
                ) : step === 1.7 ? (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                        <button
                            onClick={() => setStep(selectedOrgId && availableOrgs.length > 1 ? 1.5 : 1)}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-6 transition-colors"
                        >
                            <ArrowLeft size={16} /> Back
                        </button>

                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold mb-3">Login Method</h1>
                            <p className="text-gray-400">Where should we send your code?</p>
                        </div>

                        <div className="space-y-3">
                            {availableMethods.includes("telegram") && (
                                <button
                                    onClick={() => handleSendOTP("telegram" as any)}
                                    className="w-full flex items-center justify-between p-5 bg-[#141420] hover:bg-[#1a1a2a] border border-white/10 rounded-2xl transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                                        </div>
                                        <span className="font-bold text-white group-hover:text-blue-400 transition-colors text-lg">Telegram</span>
                                    </div>
                                    <ChevronRight className="text-gray-600 group-hover:text-blue-400 transition-colors" size={20} />
                                </button>
                            )}
                            {availableMethods.includes("whatsapp") && (
                                <button
                                    onClick={() => handleSendOTP("whatsapp" as any)}
                                    className="w-full flex items-center justify-between p-5 bg-[#141420] hover:bg-[#1a1a2a] border border-white/10 rounded-2xl transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                            <Phone size={20} />
                                        </div>
                                        <span className="font-bold text-white group-hover:text-emerald-400 transition-colors text-lg">WhatsApp</span>
                                    </div>
                                    <ChevronRight className="text-gray-600 group-hover:text-emerald-400 transition-colors" size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
                        <button
                            onClick={() => setStep(1)}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-white mb-6 transition-colors"
                        >
                            <ArrowLeft size={16} /> Back to number
                        </button>

                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold mb-3">Verify it&apos;s you</h1>
                            <p className="text-gray-400">Enter the 4-digit code we just sent to your WhatsApp or Telegram.</p>
                        </div>

                        <form onSubmit={handleVerify} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Verification Code
                                </label>
                                <div className="relative">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                                    <input
                                        type="text"
                                        required
                                        maxLength={4}
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                                        placeholder="1234"
                                        className="w-full bg-[#141420] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-center text-2xl tracking-[1em] font-bold focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm">{error}</p>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={otpCode.length < 4 || loading}
                                    className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all font-bold rounded-xl shadow-lg shadow-emerald-500/20"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : "Verify & Log In"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="mt-8 text-center text-sm text-gray-500">
                    Don't have an account? <a href="/onboarding" className="text-emerald-400 hover:underline">Sign up</a>
                </div>
            </main>
        </div>
    );
}
