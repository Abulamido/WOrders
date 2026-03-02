import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET — List all menu items for an organization, grouped by category.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();

    // Fetch categories and items together
    const { data: categories, error: catError } = await supabase
        .from("categories")
        .select("*, menu_items(*)")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .order("sort_order");

    if (catError) {
        return NextResponse.json({ error: catError.message }, { status: 500 });
    }

    return NextResponse.json({ categories });
}

/**
 * POST — Create a new menu item.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();
    const body = await req.json();

    const { data: item, error } = await supabase
        .from("menu_items")
        .insert({
            org_id: orgId,
            category_id: body.category_id,
            name: body.name,
            description: body.description || null,
            price: body.price,
            cost_price: body.cost_price || null,
            image_url: body.image_url || null,
            is_available: body.is_available ?? true,
            variants: body.variants || null,
            modifiers: body.modifiers || null,
            prep_time_min: body.prep_time_min || 15,
            sort_order: body.sort_order || 0,
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item }, { status: 201 });
}

/**
 * PATCH — Update a menu item.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();
    const body = await req.json();
    const { itemId, ...updates } = body;

    if (!itemId) {
        return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const { data: item, error } = await supabase
        .from("menu_items")
        .update(updates)
        .eq("id", itemId)
        .eq("org_id", orgId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item });
}

/**
 * DELETE — Remove a menu item.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();
    const { itemId } = await req.json();

    if (!itemId) {
        return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", itemId)
        .eq("org_id", orgId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
}
