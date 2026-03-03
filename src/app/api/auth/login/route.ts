import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const OTP_CONFIG = {
    length: 4,
    expiresInMinutes: 10,
    maxAttempts: 3,
    cooldownMinutes: 30,
};

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

        // 2. Check if currently locked out
        const { data: existingOtp } = await supabase
            .from("vendor_otps")
            .select("locked_until")
            .eq("phone", whatsapp_number)
            .single();

        if (existingOtp && existingOtp.locked_until) {
            const lockedUntil = new Date(existingOtp.locked_until);
            if (lockedUntil > new Date()) {
                const waitMins = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
                return NextResponse.json({
                    error: `Too many failed attempts. Try again in ${waitMins} minutes.`
                }, { status: 429 });
            }
        }

        // 3. Generate 4-digit OTP
        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = new Date(Date.now() + OTP_CONFIG.expiresInMinutes * 60 * 1000).toISOString();

        // 4. Save OTP to DB (upsert based on phone, reset attempts)
        const { error: otpError } = await supabase
            .from("vendor_otps")
            .upsert({
                phone: whatsapp_number,
                code: otpCode,
                expires_at: expiresAt,
                attempts: 0,
                locked_until: null
            });

        if (otpError) {
            throw new Error(`Failed to save OTP: ${otpError.message}`);
        }

        // 5. Send OTP via WhatsApp
        const { sendTextMessage } = await import("@/lib/whatsapp-sender");
        await sendTextMessage(
            whatsapp_number,
            `🌱 *CafeteriaFlow Login Code*: ${otpCode}\n\nUse this code to access your cafeteria dashboard. It expires in ${OTP_CONFIG.expiresInMinutes} minutes.`
        );

        return NextResponse.json({ success: true, message: "OTP sent successfully" });
    } catch (e: any) {
        console.error("Login error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
