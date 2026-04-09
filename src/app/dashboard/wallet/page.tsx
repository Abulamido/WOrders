"use client";

import { useState, useEffect, useCallback } from "react";
import {
    DollarSign,
    Landmark,
    ArrowUpRight,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Wallet as WalletIcon,
    TrendingUp,
    BadgeDollarSign,
    Building2,
    CreditCard,
    Save,
    AlertTriangle,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

interface WalletSummary {
    grossRevenue: number;
    totalPlatformFees: number;
    netEarnings: number;
    totalPaidOut: number;
    pendingPayouts: number;
    availableBalance: number;
    totalOrders: number;
}

interface PayoutRequest {
    id: string;
    amount: number;
    status: string;
    bank_details: any;
    notes: string | null;
    requested_at: string;
    processed_at: string | null;
}

interface PayoutAccountDetails {
    bank_name: string;
    account_holder: string;
    account_number: string;
    routing_number: string;
    bank_type: string;
}

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    pending: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Pending" },
    processing: { icon: Loader2, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Processing" },
    completed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Completed" },
    rejected: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Rejected" },
};

export default function WalletPage() {
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<WalletSummary | null>(null);
    const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
    const [payoutAccount, setPayoutAccount] = useState<PayoutAccountDetails | null>(null);

    // Bank form state
    const [showBankForm, setShowBankForm] = useState(false);
    const [bankName, setBankName] = useState("");
    const [accountHolder, setAccountHolder] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [routingNumber, setRoutingNumber] = useState("");
    const [bankType, setBankType] = useState("checking");
    const [formLoading, setFormLoading] = useState(false);
    const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Payout request state
    const [payoutAmount, setPayoutAmount] = useState("");
    const [requestingPayout, setRequestingPayout] = useState(false);

    useEffect(() => {
        const storedOrgId = localStorage.getItem("cafeteriaflow_org_id");
        if (storedOrgId) setOrgId(storedOrgId);
    }, []);

    const fetchWalletData = useCallback(async () => {
        if (!orgId) return;
        try {
            const res = await fetch(`/api/wallet?orgId=${orgId}`);
            if (res.ok) {
                const data = await res.json();
                setSummary(data.summary);
                setPayoutRequests(data.payoutRequests || []);
                if (data.payoutAccountDetails) {
                    setPayoutAccount(data.payoutAccountDetails);
                    setBankName(data.payoutAccountDetails.bank_name || "");
                    setAccountHolder(data.payoutAccountDetails.account_holder || "");
                    setAccountNumber(data.payoutAccountDetails.account_number || "");
                    setRoutingNumber(data.payoutAccountDetails.routing_number || "");
                    setBankType(data.payoutAccountDetails.bank_type || "checking");
                }
            }
        } catch (err) {
            console.error("Failed to fetch wallet data:", err);
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        if (orgId) fetchWalletData();
    }, [orgId, fetchWalletData]);

    const handleSaveBank = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orgId) return;
        setFormLoading(true);
        setFormMessage(null);

        try {
            const res = await fetch("/api/wallet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orgId,
                    action: "update_bank",
                    bankName,
                    accountHolder,
                    accountNumber,
                    routingNumber,
                    bankType,
                }),
            });

            if (res.ok) {
                setFormMessage({ type: "success", text: "Bank account saved successfully!" });
                setShowBankForm(false);
                fetchWalletData();
            } else {
                const data = await res.json();
                setFormMessage({ type: "error", text: data.error || "Failed to save." });
            }
        } catch {
            setFormMessage({ type: "error", text: "Network error." });
        } finally {
            setFormLoading(false);
        }
    };

    const handleRequestPayout = async () => {
        if (!orgId || !payoutAmount || parseFloat(payoutAmount) <= 0) return;
        setRequestingPayout(true);
        setFormMessage(null);

        try {
            const res = await fetch("/api/wallet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orgId,
                    action: "request_payout",
                    amount: parseFloat(payoutAmount),
                }),
            });

            if (res.ok) {
                setFormMessage({ type: "success", text: "Payout requested! We'll process it within 2-3 business days." });
                setPayoutAmount("");
                fetchWalletData();
            } else {
                const data = await res.json();
                setFormMessage({ type: "error", text: data.error || "Failed to request payout." });
            }
        } catch {
            setFormMessage({ type: "error", text: "Network error." });
        } finally {
            setRequestingPayout(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <WalletIcon size={28} className="text-emerald-400" />
                        Wallet &amp; Payouts
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Track your earnings and request manual payouts
                    </p>
                </div>
            </div>

            {/* Status Message */}
            {formMessage && (
                <div className={cn(
                    "px-4 py-3 rounded-xl text-sm font-medium border animate-in slide-in-from-top-2 duration-300",
                    formMessage.type === "success"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                )}>
                    {formMessage.text}
                </div>
            )}

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#141420] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <TrendingUp size={20} className="text-blue-400" />
                            </div>
                            <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Gross Revenue</span>
                        </div>
                        <p className="text-2xl font-black text-white">{formatCurrency(summary.grossRevenue)}</p>
                        <p className="text-xs text-gray-500 mt-1">{summary.totalOrders} paid orders</p>
                    </div>

                    <div className="bg-[#141420] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <BadgeDollarSign size={20} className="text-red-400" />
                            </div>
                            <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Platform Fees</span>
                        </div>
                        <p className="text-2xl font-black text-red-400">-{formatCurrency(summary.totalPlatformFees)}</p>
                        <p className="text-xs text-gray-500 mt-1">{(summary as any).feePercent}% platform fee</p>
                    </div>

                    <div className="bg-[#141420] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <DollarSign size={20} className="text-emerald-400" />
                            </div>
                            <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Net Earnings</span>
                        </div>
                        <p className="text-2xl font-black text-emerald-400">{formatCurrency(summary.netEarnings)}</p>
                        <p className="text-xs text-gray-500 mt-1">After platform fees</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                <Landmark size={20} className="text-emerald-400" />
                            </div>
                            <span className="text-xs uppercase font-bold text-emerald-400/70 tracking-wider">Available Balance</span>
                        </div>
                        <p className="text-3xl font-black text-emerald-400">{formatCurrency(summary.availableBalance)}</p>
                        <p className="text-xs text-emerald-400/50 mt-1">
                            {formatCurrency(summary.totalPaidOut)} paid out · {formatCurrency(summary.pendingPayouts)} pending
                        </p>
                    </div>
                </div>
            )}

            {/* Request Payout + Bank Account */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Request Payout */}
                <div className="bg-[#141420] border border-white/5 rounded-2xl p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <ArrowUpRight size={20} className="text-emerald-400" />
                        Request Payout
                    </h2>

                    {!payoutAccount ? (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
                            <div>
                                <p className="text-sm text-amber-400 font-medium">Bank Account Required</p>
                                <p className="text-xs text-amber-400/60 mt-1">
                                    Link your bank account first to request payouts.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Amount ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="1"
                                    max={summary?.availableBalance || 0}
                                    value={payoutAmount}
                                    onChange={(e) => setPayoutAmount(e.target.value)}
                                    placeholder="Enter amount"
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-emerald-500/50 font-mono text-white text-lg"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Available: {formatCurrency(summary?.availableBalance || 0)}
                                </p>
                            </div>

                            <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3">
                                <Building2 size={16} className="text-gray-500" />
                                <div className="text-sm">
                                    <span className="text-gray-400">Payout to: </span>
                                    <span className="text-white font-medium">
                                        {payoutAccount.bank_name} ····{payoutAccount.account_number.slice(-4)}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleRequestPayout}
                                disabled={requestingPayout || !payoutAmount || parseFloat(payoutAmount) <= 0 || parseFloat(payoutAmount) > (summary?.availableBalance || 0)}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                {requestingPayout ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <>
                                        <ArrowUpRight size={18} />
                                        Request Payout
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Bank Account */}
                <div className="bg-[#141420] border border-white/5 rounded-2xl p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <CreditCard size={20} className="text-blue-400" />
                        Bank Account
                    </h2>

                    {payoutAccount && !showBankForm ? (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border border-white/10 rounded-2xl p-5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-16 translate-x-16" />
                                <div className="relative">
                                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Bank</p>
                                    <p className="text-lg font-bold text-white mb-4">{payoutAccount.bank_name}</p>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-gray-500">Account Holder</p>
                                            <p className="text-sm text-white font-medium">{payoutAccount.account_holder}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Account</p>
                                            <p className="text-sm text-white font-mono">····{payoutAccount.account_number.slice(-4)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowBankForm(true)}
                                className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                            >
                                Update Bank Details
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSaveBank} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    required
                                    value={bankName}
                                    onChange={(e) => setBankName(e.target.value)}
                                    placeholder="e.g. Chase, Bank of America"
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Account Holder Name</label>
                                <input
                                    type="text"
                                    required
                                    value={accountHolder}
                                    onChange={(e) => setAccountHolder(e.target.value)}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Account Number</label>
                                    <input
                                        type="text"
                                        required
                                        value={accountNumber}
                                        onChange={(e) => setAccountNumber(e.target.value)}
                                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 text-white font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Routing Number</label>
                                    <input
                                        type="text"
                                        value={routingNumber}
                                        onChange={(e) => setRoutingNumber(e.target.value)}
                                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 text-white font-mono"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Account Type</label>
                                <select
                                    value={bankType}
                                    onChange={(e) => setBankType(e.target.value)}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-blue-500/50 text-white"
                                >
                                    <option value="checking">Checking</option>
                                    <option value="savings">Savings</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                {payoutAccount && (
                                    <button
                                        type="button"
                                        onClick={() => setShowBankForm(false)}
                                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    {formLoading ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            Save Bank Account
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Payout History */}
            <div className="bg-[#141420] border border-white/5 rounded-2xl p-6">
                <h2 className="text-lg font-bold mb-4">Payout History</h2>

                {payoutRequests.length === 0 ? (
                    <div className="py-12 text-center text-gray-600 text-sm">
                        No payout requests yet. Request your first payout above!
                    </div>
                ) : (
                    <div className="space-y-3">
                        {payoutRequests.map((payout) => {
                            const config = statusConfig[payout.status] || statusConfig.pending;
                            const StatusIcon = config.icon;

                            return (
                                <div
                                    key={payout.id}
                                    className="flex items-center justify-between py-3 px-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", config.bg)}>
                                            <StatusIcon size={18} className={cn(config.color, payout.status === "processing" && "animate-spin")} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{formatCurrency(payout.amount)}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(payout.requested_at).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {payout.notes && (
                                            <span className="text-xs text-gray-500 max-w-40 truncate">{payout.notes}</span>
                                        )}
                                        <span className={cn(
                                            "text-xs font-bold px-3 py-1 rounded-full border",
                                            config.bg,
                                            config.color
                                        )}>
                                            {config.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
