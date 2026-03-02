"use client";

import { useState } from "react";
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

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const toggleDayClosed = (day: string) => {
        setBusinessHours((prev) => ({
            ...prev,
            [day]: { ...prev[day], closed: !prev[day].closed },
        }));
    };

    return (
        <div className="max-w-3xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Configure your cafeteria preferences
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg",
                        saved
                            ? "bg-emerald-500 text-white shadow-emerald-500/20"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                    )}
                >
                    <Save size={16} />
                    {saved ? "Saved!" : "Save Changes"}
                </button>
            </div>

            <div className="space-y-6">
                {/* Holiday Mode */}
                <div className="bg-[#141420] border border-white/5 rounded-xl p-6">
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
                <div className="bg-[#141420] border border-white/5 rounded-xl p-6">
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
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
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
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Order Settings */}
                <div className="bg-[#141420] border border-white/5 rounded-xl p-6">
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
                                    className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-emerald-500/50"
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
                                    className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white text-center focus:outline-none focus:border-emerald-500/50"
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
        </div>
    );
}
