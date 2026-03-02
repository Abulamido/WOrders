"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    LayoutDashboard,
    ShoppingBag,
    UtensilsCrossed,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/dashboard", label: "Orders", icon: ShoppingBag },
    { href: "/dashboard/menu", label: "Menu Builder", icon: UtensilsCrossed },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        // Lightweight MVP Auth check
        const storedId = localStorage.getItem("menuhorse_org_id");
        if (!storedId) {
            router.push("/login");
        }
    }, [router]);

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* Mobile header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 bg-[#0f0f1a]/95 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3">
                    <span className="text-xl">🐴</span>
                    <span className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                        MenuHorse
                    </span>
                </div>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                    {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-40 h-screen w-64 bg-[#0f0f1a] border-r border-white/5 transition-transform duration-300 lg:translate-x-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 h-16 border-b border-white/5">
                    <span className="text-2xl">🐴</span>
                    <span className="font-bold text-xl bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                        MenuHorse
                    </span>
                </div>

                {/* Nav Links */}
                <nav className="px-3 py-6 space-y-1">
                    {navItems.map((item) => {
                        const isActive =
                            item.href === "/dashboard"
                                ? pathname === "/dashboard"
                                : pathname.startsWith(item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-500/5"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Icon size={20} />
                                {item.label}
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold">
                            A
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">Abu&apos;s Café</p>
                            <p className="text-xs text-gray-500">Starter Plan</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main content */}
            <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
                <div className="p-6 lg:p-8">{children}</div>
            </main>
        </div>
    );
}
