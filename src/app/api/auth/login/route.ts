import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { sendTextMessage as sendWhatsAppMessage } from "@/lib/whatsapp-sender";

const OTP_CONFIG = {
    length: 4,
    expiresInMinutes: 10,
    maxAttempts: 3,
    cooldownMinutes: 30,
};

export async function POST(req: NextRequest) {
    const supabase = createServiceClient();
    try {
        const { phone: rawPhone, orgId, method } = await req.json();

        if (!rawPhone) {
            return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
        }

        const phone = rawPhone.replace(/\D/g, "");
        const phoneWithPlus = `+${phone}`;

        // 1. Verify organization exists (fetch ALL matching)
        const { data: orgs, error: orgError } = await supabase
            .from("organizations")
            .select("id, name, slug, notification_telegram_id, notification_phone, whatsapp_number, agency_id")
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

        // 2. Identify available methods
        const methods: string[] = [];
        if (org.notification_telegram_id) methods.push("telegram");
        if (org.notification_phone || org.whatsapp_number) methods.push("whatsapp");

        if (methods.length === 0) {
            return NextResponse.json({ 
                error: "Your account is not linked to Telegram or WhatsApp. Please contact support to link your notification number." 
            }, { status: 403 });
        }

        // If multiple methods and NO method parameter provided, require selection
        if (methods.length > 1 && !method) {
            return NextResponse.json({ 
                requireMethodSelection: true, 
                availableMethods: methods 
            }, { status: 200 });
        }

        const chosenMethod = method || methods[0];

        // 3. Check if currently locked out
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

        let botToken: string | undefined = undefined;
        let brandName = "CafeteriaFlow";
        let brandIcon = "🌱";

        if (org.agency_id) {
            const { data: agency } = await supabase.from("agencies").select("brand_name, brand_icon, telegram_bot_token").eq("id", org.agency_id).single();
            if (agency) {
                brandName = agency.brand_name;
                brandIcon = agency.brand_icon || "🌱";
                botToken = agency.telegram_bot_token;
            }
        }

        // 5. Send OTP via chosen channel
        const otpMessage = `${brandIcon} *${brandName} Login Code*: ${otpCode}\n\nUse this code to access your vendor dashboard. It expires in ${OTP_CONFIG.expiresInMinutes} minutes.`;

        if (chosenMethod === "telegram" && org.notification_telegram_id) {
            const { sendMessage: sendTelegramMessage } = await import("@/lib/telegram-sender");
            await sendTelegramMessage(org.notification_telegram_id, otpMessage, { botToken });
        } else if (chosenMethod === "whatsapp") {
            const targetPhone = org.notification_phone || org.whatsapp_number;
            await sendWhatsAppMessage(targetPhone!, otpMessage);
        } else {
            return NextResponse.json({ error: "Invalid method or insufficient account linkage." }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: `OTP sent to your ${chosenMethod === "telegram" ? "Telegram" : "WhatsApp"}` });
    } catch (e: any) {
        console.error("Login error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
