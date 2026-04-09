import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET — Fetch wallet summary for a vendor (earnings, pending payouts, payout history).
 * Query params: ?orgId=...
 */
export async function GET(req: NextRequest) {
    const supabase = createServiceClient();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");

    if (!orgId) {
        return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    // 1. Fetch all paid orders for this org
    const { data: paidOrders, error: ordersError } = await supabase
        .from("orders")
        .select("total_amount, platform_fee, created_at")
        .eq("org_id", orgId)
        .eq("payment_status", "paid");

    if (ordersError) {
        return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    const grossRevenue = (paidOrders || []).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
    const totalPlatformFees = (paidOrders || []).reduce((sum, o) => sum + (Number(o.platform_fee) || 0), 0);
    const netEarnings = grossRevenue - totalPlatformFees;

    // 2. Fetch payout requests
    const { data: payoutRequests, error: payoutError } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });

    if (payoutError) {
        return NextResponse.json({ error: payoutError.message }, { status: 500 });
    }

    const totalPaidOut = (payoutRequests || [])
        .filter(p => p.status === "completed")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const pendingPayouts = (payoutRequests || [])
        .filter(p => p.status === "pending" || p.status === "processing")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const availableBalance = netEarnings - totalPaidOut - pendingPayouts;

    // 3. Fetch org payout account details
    const { data: org } = await supabase
        .from("organizations")
        .select("payout_account_details, platform_fee_percent")
        .eq("id", orgId)
        .single();

    return NextResponse.json({
        summary: {
            grossRevenue: Math.round(grossRevenue * 100) / 100,
            totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
            netEarnings: Math.round(netEarnings * 100) / 100,
            totalPaidOut: Math.round(totalPaidOut * 100) / 100,
            pendingPayouts: Math.round(pendingPayouts * 100) / 100,
            availableBalance: Math.round(availableBalance * 100) / 100,
            totalOrders: (paidOrders || []).length,
            feePercent: org?.platform_fee_percent || 5,
        },
        payoutRequests: payoutRequests || [],
        payoutAccountDetails: org?.payout_account_details || null,
    });
}

/**
 * POST — Request a payout or update bank account details.
 * Body: { orgId, action: "request_payout" | "update_bank", ... }
 */
export async function POST(req: NextRequest) {
    const supabase = createServiceClient();
    const body = await req.json();
    const { orgId, action } = body;

    if (!orgId) {
        return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    // --- Update Bank Account Details ---
    if (action === "update_bank") {
        const { bankName, accountHolder, accountNumber, routingNumber, bankType } = body;

        if (!bankName || !accountHolder || !accountNumber) {
            return NextResponse.json({ error: "Missing required bank fields" }, { status: 400 });
        }

        const payoutDetails = {
            bank_name: bankName,
            account_holder: accountHolder,
            account_number: accountNumber,
            routing_number: routingNumber || null,
            bank_type: bankType || "checking",
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from("organizations")
            .update({ payout_account_details: payoutDetails })
            .eq("id", orgId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Bank account details saved." });
    }

    // --- Request Payout ---
    if (action === "request_payout") {
        const { amount } = body;

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid payout amount" }, { status: 400 });
        }

        // Get current bank details
        const { data: org } = await supabase
            .from("organizations")
            .select("payout_account_details")
            .eq("id", orgId)
            .single();

        if (!org?.payout_account_details) {
            return NextResponse.json({ error: "Please link a bank account first" }, { status: 400 });
        }

        const { data: payout, error } = await supabase
            .from("payout_requests")
            .insert({
                org_id: orgId,
                amount,
                bank_details: org.payout_account_details,
                status: "pending",
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, payout }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
