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
        const { phone, code, orgId } = await req.json();

        if (!phone || !code) {
            return NextResponse.json({ error: "Phone number and code are required" }, { status: 400 });
        }

        // 1. Fetch OTP from DB
        const { data: otp, error: otpError } = await supabase
            .from("vendor_otps")
            .select("*")
            .eq("phone", phone)
            .single();

        if (otpError || !otp) {
            return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 401 });
        }

        // 2. Check if locked out
        if (otp.locked_until) {
            const lockedUntil = new Date(otp.locked_until);
            if (lockedUntil > new Date()) {
                const waitMins = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
                return NextResponse.json({
                    error: `Account locked due to too many failed attempts. Try again in ${waitMins} minutes.`
                }, { status: 429 });
            }
        }

        // 3. Check if expired
        if (new Date(otp.expires_at) < new Date()) {
            return NextResponse.json({ error: "Verification code has expired" }, { status: 401 });
        }

        // 4. Verify code
        if (otp.code !== code) {
            const newAttempts = (otp.attempts || 0) + 1;

            if (newAttempts >= OTP_CONFIG.maxAttempts) {
                // Lock out the account
                const lockedUntil = new Date(Date.now() + OTP_CONFIG.cooldownMinutes * 60 * 1000).toISOString();
                await supabase
                    .from("vendor_otps")
                    .update({ attempts: newAttempts, locked_until: lockedUntil })
                    .eq("phone", phone);

                return NextResponse.json({
                    error: `Too many failed attempts. Account locked for ${OTP_CONFIG.cooldownMinutes} minutes.`
                }, { status: 429 });
            } else {
                // Just log the attempt
                await supabase
                    .from("vendor_otps")
                    .update({ attempts: newAttempts })
                    .eq("phone", phone);

                const remaining = OTP_CONFIG.maxAttempts - newAttempts;
                return NextResponse.json({
                    error: `Incorrect verification code. ${remaining} attempt(s) remaining.`
                }, { status: 401 });
            }
        }

        // 5. Code is correct! Find the organization
        let query = supabase
            .from("organizations")
            .select("id, name");
            
        if (orgId) {
            query = query.eq("id", orgId);
        } else {
            query = query.or(`whatsapp_number.eq.${phone},notification_phone.eq.${phone}`);
        }

        const { data: org, error: orgError } = await query.single();

        if (orgError || !org) {
            return NextResponse.json({ error: "Associated organization not found" }, { status: 404 });
        }

        // 6. Success! Delete the OTP record to prevent reuse
        await supabase
            .from("vendor_otps")
            .delete()
            .eq("phone", phone);

        return NextResponse.json({ orgId: org.id, name: org.name });
    } catch (e: any) {
        console.error("Verification error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
