import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await params;
    const supabase = createServiceClient();

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // 1. Ensure bucket exists (MVP: assume it exists, or create if needed)
        // Note: createBucket requires superuser/admin perms usually. 
        // We'll proceed assuming 'menu-images' is set up in dashboard.

        const fileExt = file.name.split(".").pop();
        const fileName = `${orgId}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // 2. Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from("menu-images")
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type,
            });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 3. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from("menu-images")
            .getPublicUrl(filePath);

        return NextResponse.json({ url: publicUrl });

    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
