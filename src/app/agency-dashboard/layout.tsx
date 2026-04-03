"use client";

import { LogOut, LayoutDashboard, Palette, Settings, Loader2, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand-context";

const navItems = [
    { href: "/agency-dashboard", label: "Dashboard", icon: LayoutDashboard },
    // More tabs can be added later
];

export default function AgencyDashboardLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const brand = useBrand();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [agencyId, setAgencyId] = useState<string | null>(null);

    useEffect(() => {
        // Skip auth check if we are on the login page
        if (pathname === "/agency-dashboard/login") {
            setLoading(false);
            return;
        }

        const storedId = localStorage.getItem("cf_agency_id");
        if (!storedId) {
            router.push("/agency-dashboard/login");
        } else {
            setAgencyId(storedId);
            setLoading(false);
        }
    }, [pathname, router]);

    const handleLogout = () => {
        localStorage.removeItem("cf_agency_id");
        localStorage.removeItem("cf_agency_slug");
        router.push("/agency-dashboard/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <Loader2 className="animate-spin text-purple-400" />
            </div>
        );
    }

    if (pathname === "/agency-dashboard/login") {
        return <>{children}</>;
    }

    if (!agencyId) return null;

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-gray-200 flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 bg-[#0f0f1a]/95 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center gap-3">
                    <span className="text-xl">{brand.icon}</span>
                    <span className="font-bold text-lg bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
                        Agency Hub
                    </span>
                </div>
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 -mr-2 text-gray-400 hover:text-white"
                >
                    <Menu size={24} />
                </button>
            </header>

            {/* Sidebar */}
            <aside 
                className={cn(
                    "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#141420] border-r border-white/5 flex flex-col transform transition-transform duration-300 ease-in-out lg:transform-none shadow-2xl lg:shadow-none",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{brand.icon}</span>
                        <span className="font-bold text-xl bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
                            {brand.name}
                        </span>
                    </div>
                    <button 
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-2 -mr-2 text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="px-6 py-4 border-b border-white/5 bg-[#1a1a2a]">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Agency Portal</div>
                    <div className="text-sm font-medium text-white truncate text-purple-400">Manage Your Business</div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group font-medium text-sm",
                                    isActive 
                                        ? "bg-purple-500/10 text-purple-400" 
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <Icon size={20} className={cn(
                                    "transition-colors",
                                    isActive ? "text-purple-400" : "text-gray-500 group-hover:text-gray-300"
                                )} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors text-sm font-medium"
                    >
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0f] pt-16 lg:pt-0 h-screen overflow-y-auto">
                <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
