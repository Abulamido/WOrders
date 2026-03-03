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

    const { data: org, error } = await supabase
        .from("organizations")
        .insert({
            name: body.name,
            slug,
            whatsapp_number: body.whatsapp_number,
            notification_phone: body.notification_phone || body.whatsapp_number, // Default to business number if not provided
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
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
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
