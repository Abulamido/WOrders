import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET — List all organizations (admin).
 */
export async function GET() {
    const supabase = createServiceClient();

    const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ organizations: data });
}

/**
 * POST — Create a new organization.
 */
export async function POST(req: NextRequest) {
    const supabase = createServiceClient();
    const body = await req.json();

    const slug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    // Build the insert payload — only include fields that exist in the database
    const insertPayload: Record<string, unknown> = {
        name: body.name,
        slug,
        whatsapp_number: body.whatsapp_number,
        plan: body.plan || "starter",
        is_active: true,
        business_hours: body.business_hours || {
            mon: { open: "08:00", close: "18:00" },
            tue: { open: "08:00", close: "18:00" },
            wed: { open: "08:00", close: "18:00" },
            thu: { open: "08:00", close: "18:00" },
            fri: { open: "08:00", close: "18:00" },
        },
        timezone: body.timezone || "America/New_York",
    };

    const { data: org, error } = await supabase
        .from("organizations")
        .insert(insertPayload)
        .select()
        .single();

    if (error) {
        console.error("Supabase org creation error:", JSON.stringify(error));
        return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 500 });
    }

    // Try to set notification_phone separately (column may not exist in older schemas)
    if (body.notification_phone) {
        try {
            await supabase
                .from("organizations")
                .update({ notification_phone: body.notification_phone })
                .eq("id", org.id);
        } catch {
            // Column doesn't exist yet — silently ignore
        }
    }

    // Create default menu categories
    const defaultCategories = ["Breakfast", "Lunch", "Drinks", "Desserts"];
    await supabase.from("categories").insert(
        defaultCategories.map((name, i) => ({
            org_id: org.id,
            name,
            sort_order: i,
            is_active: true,
        }))
    );

    return NextResponse.json({ organization: org }, { status: 201 });
}

/**
 * PATCH — Update an organization.
 */
export async function PATCH(req: NextRequest) {
    const supabase = createServiceClient();
    const body = await req.json();
    const { orgId, ...updates } = body;

    if (!orgId) {
        return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const { data: org, error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", orgId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ organization: org });
}
