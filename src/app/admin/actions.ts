"use server";

import { createServiceClient } from "@/lib/supabase";

export async function getAdminDashboardStats() {
    const supabase = createServiceClient();
    try {
        // Fetch vendors
        const { data: orgs } = await supabase
            .from("organizations")
            .select("*")
            .order("created_at", { ascending: false });

        // Fetch customers
        const { count: customerCount } = await supabase
            .from("customers")
            .select("*", { count: "exact", head: true });

        // Fetch orders
        const { data: orders } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("payment_status", "paid");

        const totalRevenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
        
        // Calculate Total Platform Fees (Our cut)
        const { data: feeOrders } = await supabase
            .from("orders")
            .select("platform_fee")
            .eq("payment_status", "paid");
        const totalPlatformFees = feeOrders?.reduce((sum, order) => sum + (Number(order.platform_fee) || 0), 0) || 0;

        return {
            totalVendors: orgs?.length || 0,
            activeVendors: orgs?.filter(o => o.is_active && o.approval_status === "approved").length || 0,
            pendingApprovals: orgs?.filter(o => o.approval_status === "pending").length || 0,
            totalCustomers: customerCount || 0,
            totalOrders: orders?.length || 0,
            totalRevenue,
            totalPlatformFees,
            recentVendors: orgs?.slice(0, 5) || []
        };
    } catch (err) {
        console.error("Admin stats error:", err);
        return {
            totalVendors: 0,
            activeVendors: 0,
            totalCustomers: 0,
            totalOrders: 0,
            totalRevenue: 0,
            recentVendors: []
        };
    }
}

export async function getAdminVendors() {
    const supabase = createServiceClient();
    const { data } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });
    return data || [];
}

export async function toggleAdminVendorStatus(id: string, newStatus: boolean) {
    const supabase = createServiceClient();
    const { error } = await supabase
        .from("organizations")
        .update({ is_active: newStatus })
        .eq("id", id);

    if (error) {
        console.error("Failed to toggle admin status", error);
        throw new Error("Failed to update status");
    }
}

export async function updateVendorApprovalStatus(id: string, status: "approved" | "rejected" | "pending") {
    const supabase = createServiceClient();
    const { error } = await supabase
        .from("organizations")
        .update({ approval_status: status })
        .eq("id", id);

    if (error) {
        console.error("Failed to update approval status", error);
        throw new Error("Failed to update approval status");
    }
}

export async function updateVendorPlatformFee(id: string, fee: number) {
    const supabase = createServiceClient();
    const { error } = await supabase
        .from("organizations")
        .update({ platform_fee_percent: fee })
        .eq("id", id);

    if (error) {
        console.error("Failed to update platform fee", error);
        throw new Error("Failed to update platform fee");
    }
}

export async function getAdminCustomers() {
    const supabase = createServiceClient();
    const { data } = await supabase
        .from("customers")
        .select("*, organizations(name, slug)")
        .order("last_order_at", { ascending: false });
    return data || [];
}
