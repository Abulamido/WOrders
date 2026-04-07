"use server";

import { createServiceClient } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

async function ensureAdmin() {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        throw new Error("Unauthorized: Admin access required");
    }
    return session;
}

export async function getAdminDashboardStats() {
    await ensureAdmin();
    const supabase = createServiceClient();
    try {
        // ... existing stats logic ...
        // Fetch vendors
        const { data: orgs } = await supabase
            .from("organizations")
            .select("*")
            .order("created_at", { ascending: false });

        // Fetch customers
        const { count: customerCount } = await supabase
            .from("customers")
            .select("*", { count: "exact", head: true });

        // Fetch all paid orders
        const { data: orderData } = await supabase
            .from("orders")
            .select("total_amount, platform_fee, org_id")
            .eq("payment_status", "paid");

        const totalRevenue = orderData?.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;
        
        // Get IDs of orgs that belong to an agency (so we can exclude their fees)
        const { data: agencyOrgs } = await supabase
            .from("organizations")
            .select("id")
            .not("agency_id", "is", null);
        const agencyOrgIds = new Set((agencyOrgs || []).map(o => o.id));

        // Calculate Total Platform Fees (Our cut - only from direct vendors)
        const platformRevenue = orderData?.filter(o => !agencyOrgIds.has(o.org_id))
            .reduce((sum, order) => sum + (Number(order.platform_fee) || 0), 0) || 0;

        // Fetch agency count
        const { count: agencyCount } = await supabase
            .from("agencies")
            .select("*", { count: "exact", head: true });

        return {
            totalVendors: orgs?.length || 0,
            activeVendors: orgs?.filter(o => o.is_active && o.approval_status === "approved").length || 0,
            pendingApprovals: orgs?.filter(o => o.approval_status === "pending").length || 0,
            totalAgencies: agencyCount || 0,
            totalCustomers: customerCount || 0,
            totalOrders: orderData?.length || 0,
            totalRevenue,
            totalPlatformFees: platformRevenue,
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
    await ensureAdmin();
    const supabase = createServiceClient();
    const { data } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });
    return data || [];
}

export async function toggleAdminVendorStatus(id: string, newStatus: boolean) {
    await ensureAdmin();
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
    await ensureAdmin();
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
    await ensureAdmin();
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
    await ensureAdmin();
    const supabase = createServiceClient();
    const { data } = await supabase
        .from("customers")
        .select("*, organizations(name, slug)")
        .order("last_order_at", { ascending: false });
    return data || [];
}

import { revalidatePath } from "next/cache";

export async function createAgency(formData: FormData) {
    await ensureAdmin();
    const supabase = createServiceClient();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const ownerName = formData.get("ownerName") as string;
    const ownerPhone = formData.get("ownerPhone") as string;

    if (!name || !slug) throw new Error("Name and Slug are required");

    const { error } = await supabase.from("agencies").insert({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        brand_name: name,
        owner_name: ownerName,
        owner_phone: ownerPhone,
        owner_password: "changeme123" // Default password
    });

    if (error) {
        console.error("Failed to create agency:", error);
        throw new Error(error.message);
    }
    
    revalidatePath("/admin/agencies");
}
