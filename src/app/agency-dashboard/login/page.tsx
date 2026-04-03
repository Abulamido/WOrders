"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, Loader2 } from "lucide-react";

export default function AgencyLoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [slug, setSlug] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/agency/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug: slug.toLowerCase(), password }),
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem("cf_agency_id", data.agencyId);
                localStorage.setItem("cf_agency_slug", data.slug);
                router.push("/agency-dashboard");
            } else {
                setError(data.error || "Failed to log in");
            }
        } catch (err) {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building2 className="text-purple-400" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Agency Dashboard</h1>
                    <p className="text-gray-400 text-sm">Reseller / White-Label Partner Login</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Agency Slug
                        </label>
                        <input
                            type="text"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="e.g. fooddash"
                            className="w-full bg-[#141420] border border-white/10 rounded-xl py-4 px-4 focus:outline-none focus:border-purple-500/50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password (default: changeme123)"
                                className="w-full bg-[#141420] border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-purple-500/50"
                            />
                        </div>
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading || !slug || !password}
                        className="w-full py-4 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:hover:bg-purple-500 font-bold rounded-xl shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : "Log In"}
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-4 border-t border-white/5 pt-4">This portal is for Agency Partners. Vendors should log in at your custom domain.</p>
                </form>
            </div>
        </div>
    );
}
