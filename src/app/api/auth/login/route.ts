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
        const { phone: rawPhone, orgId } = await req.json();

        if (!rawPhone) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        const phone = rawPhone.replace(/\D/g, "");
        const phoneWithPlus = `+${phone}`;

        // 1. Verify organization exists (fetch ALL matching)
        const { data: orgs, error: orgError } = await supabase
            .from("organizations")
            .select("id, name, slug, notification_telegram_id")
            .or(`whatsapp_number.eq.${phone},notification_phone.eq.${phone},whatsapp_number.eq.${phoneWithPlus},notification_phone.eq.${phoneWithPlus}`)
            .eq("is_active", true);

        if (orgError || !orgs || orgs.length === 0) {
            return NextResponse.json({ error: "Organization not found for this phone number." }, { status: 404 });
        }

        // If multiple orgs and NO orgId provided, require selection
        if (orgs.length > 1 && !orgId) {
            return NextResponse.json({ 
                requireSelection: true, 
                organizations: orgs.map(o => ({ id: o.id, name: o.name, slug: o.slug }))
            }, { status: 200 });
        }

        // Use the selected org OR the only one found
        const org = orgId ? orgs.find(o => o.id === orgId) : orgs[0];

        if (!org) {
            return NextResponse.json({ error: "Selected organization not found" }, { status: 404 });
        }

        if (!org.notification_telegram_id) {
            return NextResponse.json({ 
                error: "Your Telegram account is not linked. Please connect your Telegram in the Admin panel first." 
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
