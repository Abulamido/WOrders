"use client";

import { useState, useEffect } from "react";
import {
    Clock,
    Calendar,
    Globe,
    Bell,
    Shield,
    PauseCircle,
    Save,
    ToggleLeft,
    ToggleRight,
    QrCode,
    Copy,
    ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const daysOfWeek = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const dayLabels: Record<string, string> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
};

interface BusinessHours {
    open: string;
    close: string;
    closed?: boolean;
}

export default function SettingsPage() {
    const [businessHours, setBusinessHours] = useState<Record<string, BusinessHours>>({
        mon: { open: "08:00", close: "18:00" },
        tue: { open: "08:00", close: "18:00" },
        wed: { open: "08:00", close: "18:00" },
        thu: { open: "08:00", close: "18:00" },
        fri: { open: "08:00", close: "18:00" },
        sat: { open: "09:00", close: "15:00" },
        sun: { open: "00:00", close: "00:00", closed: true },
    });

    const [holidayMode, setHolidayMode] = useState(false);
    const [prepTime, setPrepTime] = useState(15);
    const [maxOrders, setMaxOrders] = useState(20);
    const [autoAccept, setAutoAccept] = useState(true);
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [orgId, setOrgId] = useState("");
    const [copied, setCopied] = useState(false);

    // Load saved org ID and fetch settings on mount
    useEffect(() => {
        const id = localStorage.getItem("cafeteriaflow_org_id");
        if (id) {
            setOrgId(id);
            fetchSettings(id);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchSettings = async (id: string) => {
        try {
            const res = await fetch(`/api/organizations?id=${id}`);
            if (res.ok) {
                const data = await res.json();
                if (data.business_hours) {
                    // Merge with defaults so missing days don't crash
                    const defaults: Record<string, BusinessHours> = {
                        mon: { open: "08:00", close: "18:00" },
                        tue: { open: "08:00", close: "18:00" },
                        wed: { open: "08:00", close: "18:00" },
                        thu: { open: "08:00", close: "18:00" },
                        fri: { open: "08:00", close: "18:00" },
                        sat: { open: "09:00", close: "15:00" },
                        sun: { open: "00:00", close: "00:00", closed: true },
                    };
                    const merged: Record<string, BusinessHours> = {};
                    for (const day of daysOfWeek) {
                        merged[day] = {
                            ...defaults[day],
                            ...(data.business_hours[day] || {}),
                        };
                    }
                    setBusinessHours(merged);
                }
                if (typeof data.is_active === "boolean") setHolidayMode(!data.is_active);
                if (data.slug) setOrgSlug(data.slug);
            }
        } catch (err) {
            console.error("Failed to fetch settings:", err);
        } finally {
            setLoading(false);
        }
    };

    const [orgSlug, setOrgSlug] = useState("");

    const telegramUsername = "Cafteriaflow";
    const telegramLink = orgSlug
        ? `https://t.me/${telegramUsername}?start=${orgSlug}`
        : "";

    const handleCopyLink = () => {
        navigator.clipboard.writeText(telegramLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = async () => {
        if (!orgId) return;
        setSaving(true);
        try {
            const res = await fetch("/api/organizations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orgId,
                    business_hours: businessHours,
                    is_active: !holidayMode,
                })
            });

            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(true), 2000); // Fixed below
            }
        } catch (err) {
            console.error("Failed to save settings:", err);
        } finally {
            setSaving(false);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const toggleDayClosed = (day: string) => {
        setBusinessHours((prev) => ({
            ...prev,
            [day]: { ...prev[day], closed: !prev[day].closed },
        }));
    };

    return (
        <div className="max-w-3xl space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">

                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Configure your cafeteria preferences
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg",
                        saved
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-emerald-500/10"
                            : "bg-emerald-500 hover:bg-emerald-400 text-gray-900 shadow-emerald-500/20 disabled:opacity-50"
                    )}
                >
                    {saved ? (
                        <>Saved!</>
                    ) : (saving ? (
                        <>Saving...</>
                    ) : (
                        <><Save size={16} /> Save Changes</>
                    ))}
                </button>
            </div>

            {loading ? (
                <div className="text-gray-400 animate-pulse">Loading settings...</div>
            ) : (
                <>
                    {/* Ordering Link & QR Code */}
                    <div className="bg-white border border-emerald-500/20 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <QrCode size={20} className="text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-emerald-400">Your Ordering Link</h3>
                                <p className="text-sm text-gray-400">Share this link with customers to get orders</p>
                            </div>
                        </div>

                        <div className="bg-black/40 border border-gray-200 rounded-xl p-4 mb-4 flex items-center justify-between">
                            <code className="text-sm text-emerald-400 break-all bg-transparent outline-none flex-1">
                                {telegramLink || "Loading your link..."}
                            </code>
                            <button
                                onClick={handleCopyLink}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-emerald-400 transition-colors ml-4 shrink-0"
                                title="Copy link"
                                disabled={!telegramLink}
                            >
                                <Copy size={18} />
                            </button>
                            {copied && <span className="ml-2 text-xs text-emerald-400 absolute right-16">Copied!</span>}
                        </div>

                        <div className="flex gap-4">
                            <a
                                href={telegramLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-sm rounded-xl hover:bg-emerald-500/20 transition-all"
                            >
                                <ExternalLink size={16} /> Open Bot
                            </a>
                            <a
                                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(telegramLink)}&bgcolor=ffffff&color=000000`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-gray-200 text-gray-900 font-semibold text-sm rounded-xl hover:bg-white/10 transition-all"
                            >
                                <QrCode size={16} /> Download QR Code
                            </a>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Telegram Notifications */}
                        <div className="bg-white border border-blue-500/20 rounded-xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-300" />
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <Bell size={20} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-blue-400">Telegram Order Alerts</h3>
                                        <p className="text-sm text-gray-400">
                                            Get real-time order alerts and manage orders directly from Telegram.
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={`https://t.me/${telegramUsername}?start=vendor_${orgId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-gray-900 text-sm font-bold rounded-lg transition-all"
                                >
                                    Link Telegram Bot
                                </a>
                            </div>
                        </div>

                        {/* Holiday Mode */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                        <PauseCircle size={20} className="text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Holiday Mode</h3>
                                        <p className="text-sm text-gray-400">
                                            Pause all incoming orders temporarily
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setHolidayMode(!holidayMode)}
                                    className="text-3xl"
                                >
                                    {holidayMode ? (
                                        <ToggleRight className="text-red-400" size={36} />
                                    ) : (
                                        <ToggleLeft className="text-gray-600" size={36} />
                                    )}
                                </button>
                            </div>
                            {holidayMode && (
                                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    ⚠️ Orders are currently paused. Customers will see
                                    &quot;temporarily closed&quot;.
                                </div>
                            )}
                        </div>

                        {/* Business Hours */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Clock size={20} className="text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Business Hours</h3>
                                    <p className="text-sm text-gray-400">
                                        Set when you accept orders
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {daysOfWeek.map((day) => {
                                    const hours = businessHours[day];
                                    return (
                                        <div
                                            key={day}
                                            className="flex items-center gap-4 py-2"
                                        >
                                            <span className="w-24 text-sm font-medium text-gray-300">
                                                {dayLabels[day]}
                                            </span>
                                            <button
                                                onClick={() => toggleDayClosed(day)}
                                                className={cn(
                                                    "px-3 py-1 rounded-lg text-xs font-semibold transition-colors",
                                                    hours.closed
                                                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                )}
                                            >
                                                {hours.closed ? "Closed" : "Open"}
                                            </button>
                                            {!hours.closed && (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="time"
                                                        value={hours.open}
                                                        onChange={(e) =>
                                                            setBusinessHours((prev) => ({
                                                                ...prev,
                                                                [day]: { ...prev[day], open: e.target.value },
                                                            }))
                                                        }
                                                        className="bg-white/5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-emerald-500/50"
                                                    />
                                                    <span className="text-gray-500 text-sm">to</span>
                                                    <input
                                                        type="time"
                                                        value={hours.close}
                                                        onChange={(e) =>
                                                            setBusinessHours((prev) => ({
                                                                ...prev,
                                                                [day]: { ...prev[day], close: e.target.value },
                                                            }))
                                                        }
                                                        className="bg-white/5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-emerald-500/50"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Order Settings */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                                    <Shield size={20} className="text-violet-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Order Settings</h3>
                                    <p className="text-sm text-gray-400">
                                        Fine-tune your order handling
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-5">
                                {/* Min prep time */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">Minimum Prep Time</p>
                                        <p className="text-xs text-gray-500">
                                            Earliest pickup time for new orders
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={prepTime}
                                            onChange={(e) => setPrepTime(Number(e.target.value))}
                                            className="w-20 bg-white/5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 text-center focus:outline-none focus:border-emerald-500/50"
                                        />
                                        <span className="text-sm text-gray-500">min</span>
                                    </div>
                                </div>

                                {/* Max orders per slot */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">Max Orders per Slot</p>
                                        <p className="text-xs text-gray-500">
                                            Order capacity per 15-min window
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={maxOrders}
                                            onChange={(e) => setMaxOrders(Number(e.target.value))}
                                            className="w-20 bg-white/5 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 text-center focus:outline-none focus:border-emerald-500/50"
                                        />
                                        <span className="text-sm text-gray-500">/slot</span>
                                    </div>
                                </div>

                                {/* Auto-accept */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">Auto-Accept Paid Orders</p>
                                        <p className="text-xs text-gray-500">
                                            Automatically move paid orders to Preparing
                                        </p>
                                    </div>
                                    <button onClick={() => setAutoAccept(!autoAccept)}>
                                        {autoAccept ? (
                                            <ToggleRight className="text-emerald-400" size={32} />
                                        ) : (
                                            <ToggleLeft className="text-gray-600" size={32} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

