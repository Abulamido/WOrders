import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();

        // Use environment variable with fallback
        const adminPassword = process.env.ADMIN_PASSWORD || "CF_SECRET_2024";

        if (password === adminPassword) {
            // Set session cookie with admin role
            await setSessionCookie({
                role: 'admin',
            });

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
    }
}
