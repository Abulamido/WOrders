"use client";

import { LogOut, Store, LayoutDashboard, Users, Activity, Lock, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { ReactNode, useState, useEffect } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const authId = sessionStorage.getItem("cf_admin_auth");
        if (authId === "true") {
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // MVP Hardcoded Admin Password
        if (password === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "CF_SECRET_2024")) {
            sessionStorage.setItem("cf_admin_auth", "true");
            setIsAuthenticated(true);
            setError("");
        } else {
            setError("Invalid admin password");
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem("cf_admin_auth");
        setIsAuthenticated(false);
    };

    if (loading) {
        return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-400" /></div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="text-red-400" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Admin Portal</h1>
                        <p className="text-gray-400 text-sm">Restricted Access Only</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter admin password"
                                className="w-full bg-[#141420] border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-red-500/50"
                            />
                        </div>
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <button
                            type="submit"
                            className="w-full py-4 bg-red-500 hover:bg-red-600 font-bold rounded-xl transition-all"
                        >
                            Log In
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-gray-200 flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 bg-[#141420] flex-shrink-0 flex flex-col hidden md:flex">
                <div className="p-6 border-b border-white/5">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl">🌱</span>
                        <span className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                            CafeteriaFlow
                        </span>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-semibold ml-1">
                            ADMIN
                        </span>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-emerald-400 bg-emerald-500/10"
                    >
                        <LayoutDashboard size={20} />
                        <span className="font-medium">Overview</span>
                    </Link>
                    <Link
                        href="/admin/vendors"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                    >
                        <Store size={20} />
                        <span className="font-medium">Vendors</span>
                    </Link>
                    <Link
                        href="/admin/customers"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                    >
                        <Users size={20} />
                        <span className="font-medium">Customers</span>
                    </Link>
                    <Link
                        href="/admin/activity"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                    >
                        <Activity size={20} />
                        <span className="font-medium">Activity</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0f]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Platform Admin</h1>
                        <p className="text-sm text-gray-400">Manage all cafeteria operations</p>
                    </div>
                </div>
                <div className="p-6 overflow-auto">{children}</div>
            </main>
        </div>
    );
}
