import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
        return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Fetch ALL organizations, then do JS-side matching for both full and short IDs
    const { data: orgs, error } = await supabase
        .from("organizations")
        .select("id, name");

    if (error || !orgs || orgs.length === 0) {
        return NextResponse.json({ error: "No organizations found in database" }, { status: 404 });
    }

    // Match by full UUID or by short ID prefix
    const org = orgs.find(o => o.id === orgId || o.id.startsWith(orgId));

    if (!org) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Generate HTML that sets localStorage and redirects
    const html = `
        <!DOCTYPE html>
        <html>
            <head>
                <title>Logging you in...</title>
                <script>
                    localStorage.setItem("cafeteriaflow_org_id", "${org.id}");
                    localStorage.setItem("cafeteriaflow_org_name", "${org.name.replace(/"/g, '\\"')}");
                    window.location.href = "/dashboard";
                </script>
            </head>
            <body style="background: #0a0a0f; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
                <p>Authenticating as ${org.name}...</p>
            </body>
        </html>
    `;

    return new NextResponse(html, {
        headers: { "Content-Type": "text/html" },
    });
}
