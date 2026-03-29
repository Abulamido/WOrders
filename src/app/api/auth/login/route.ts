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
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        // 1. Verify organization exists (by whatsapp_number or notification_phone)
        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("id, name, whatsapp_number, notification_phone, notification_telegram_id")
            .or(`whatsapp_number.eq.${phone},notification_phone.eq.${phone}`)
            .eq("is_active", true)
            .single();

        if (orgError || !org) {
            return NextResponse.json({ error: "Organization not found for this phone number." }, { status: 404 });
        }

        if (!org.notification_telegram_id) {
            return NextResponse.json({ 
                error: "Your Telegram account is not linked. Please open our Telegram bot and type /vendor to link your account first." 
            }, { status: 403 });
        }

        // 2. Check if currently locked out
        const { data: existingOtp } = await supabase
            .from("vendor_otps")
            .select("locked_until")
            .eq("phone", phone)
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
                phone: phone,
                code: otpCode,
                expires_at: expiresAt,
                attempts: 0,
                locked_until: null
            });

        if (otpError) {
            throw new Error(`Failed to save OTP: ${otpError.message}`);
        }

        // 5. Send OTP via Telegram
        const otpMessage = `🌱 *CafeteriaFlow Login Code*: ${otpCode}\n\nUse this code to access your vendor dashboard. It expires in ${OTP_CONFIG.expiresInMinutes} minutes.`;

        const { sendMessage } = await import("@/lib/telegram-sender");
        await sendMessage(org.notification_telegram_id, otpMessage);

        return NextResponse.json({ success: true, message: "OTP sent to your Telegram" });
    } catch (e: any) {
        console.error("Login error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
