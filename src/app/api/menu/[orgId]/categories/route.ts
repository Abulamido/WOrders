import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

/**
 * GET — List all categories for an organization.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();

    const { data: categories, error } = await supabase
        .from("categories")
        .select("*")
        .eq("org_id", orgId)
        .order("sort_order");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories });
}

/**
 * POST — Create a new category.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();
    const body = await req.json();

    const { data: category, error } = await supabase
        .from("categories")
        .insert({
            org_id: orgId,
            name: body.name,
            sort_order: body.sort_order || 0,
            is_active: true,
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category }, { status: 201 });
}

/**
 * PATCH — Update a category.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();
    const body = await req.json();
    const { categoryId, ...updates } = body;

    if (!categoryId) {
        return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    const { data: category, error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", categoryId)
        .eq("org_id", orgId)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ category });
}

/**
 * DELETE — Remove a category.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();
    const { categoryId } = await req.json();

    if (!categoryId) {
        return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }

    const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId)
        .eq("org_id", orgId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
}
