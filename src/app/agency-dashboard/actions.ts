"use server";

import { createServiceClient } from "@/lib/supabase";

export async function getAgencyData(agencyId: string) {
    const supabase = createServiceClient();
    
    const [agencyRes, orgsRes] = await Promise.all([
        supabase.from("agencies").select("*").eq("id", agencyId).single(),
        supabase.from("organizations").select("id, name, slug, phone, is_active").eq("agency_id", agencyId)
    ]);

    const orgIds = orgsRes.data?.map(o => o.id) || [];
    
    // Fetch all paid orders for these organizations
    const { data: orders } = await supabase
        .from("orders")
        .select("total_amount, platform_fee")
        .in("org_id", orgIds)
        .eq("payment_status", "paid");

    const grossRevenue = orders?.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0) || 0;
    const totalCommissions = orders?.reduce((sum, o) => sum + (Number(o.platform_fee) || 0), 0) || 0;
    
    return {
        agency: agencyRes.data,
        organizations: orgsRes.data || [],
        stats: {
            grossRevenue,
            totalCommissions,
            totalOrders: orders?.length || 0
        }
    };
}

export async function updateAgencyBranding(agencyId: string, formData: any) {
    const supabase = createServiceClient();
    
    const updates = {
        brand_name: formData.brand_name,
        brand_icon: formData.brand_icon,
        brand_primary_color: formData.brand_primary_color,
        brand_secondary_color: formData.brand_secondary_color,
        telegram_bot_token: formData.telegram_bot_token,
        telegram_bot_username: formData.telegram_bot_username,
        custom_domain: formData.custom_domain,
        stripe_publishable_key: formData.stripe_publishable_key,
        stripe_secret_key: formData.stripe_secret_key,
        stripe_webhook_secret: formData.stripe_webhook_secret,
        platform_fee_percent: Number(formData.platform_fee_percent),
    };
    
    const { error } = await supabase.from("agencies").update(updates).eq("id", agencyId);
    
    if (error) throw new Error(error.message);
    return { success: true };
}
