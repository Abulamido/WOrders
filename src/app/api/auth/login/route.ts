import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    const supabase = createServiceClient();
    try {
        const { whatsapp_number } = await req.json();

        if (!whatsapp_number) {
            return NextResponse.json({ error: "WhatsApp number is required" }, { status: 400 });
        }

        // 1. Verify organization exists
        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("id, name")
            .eq("whatsapp_number", whatsapp_number)
            .eq("is_active", true)
            .single();

        if (orgError || !org) {
            return NextResponse.json({ error: "Organization not found for this number" }, { status: 404 });
        }

        // 2. Generate 4-digit OTP
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins

        // 3. Save OTP to DB (upsert based on phone)
        const { error: otpError } = await supabase
            .from("vendor_otps")
            .upsert({
                phone: whatsapp_number,
                code: otpCode,
                expires_at: expiresAt
            });

        if (otpError) {
            throw new Error(`Failed to save OTP: ${otpError.message}`);
        }

        // 4. Send OTP via WhatsApp
        const { sendTextMessage } = await import("@/lib/whatsapp-sender");
        await sendTextMessage(
            whatsapp_number,
            `🐴 *MenuHorse Login Code*: ${otpCode}\n\nUse this code to access your cafeteria dashboard. It expires in 10 minutes.`
        );

        return NextResponse.json({ success: true, message: "OTP sent successfully" });
    } catch (e: any) {
        console.error("Login error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
