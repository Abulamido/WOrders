import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    const supabase = createServiceClient();
    try {
        const { slug, password } = await req.json();

        if (!slug || !password) {
            return NextResponse.json({ error: "Slug and password are required" }, { status: 400 });
        }

        // Verify agency exists and password matches
        const { data: agency, error: agencyError } = await supabase
            .from("agencies")
            .select("id, slug, owner_password")
            .eq("slug", slug)
            .eq("is_active", true)
            .single();

        if (agencyError || !agency) {
            return NextResponse.json({ error: "Agency not found or inactive." }, { status: 404 });
        }

        if (agency.owner_password !== password) {
            // Check if there is no password set and they entered 'changeme123'
            if (!agency.owner_password && password === "changeme123") {
                // Allows default login if null
            } else {
                return NextResponse.json({ error: "Invalid password." }, { status: 401 });
            }
        }

        // Send back the agency details (no tokens needed, we'll use localStorage for MVP)
        return NextResponse.json({ success: true, agencyId: agency.id, slug: agency.slug });

    } catch (e: any) {
        console.error("Agency Login error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
