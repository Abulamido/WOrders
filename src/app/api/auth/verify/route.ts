import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    const supabase = createServiceClient();
    try {
        const { whatsapp_number, code } = await req.json();

        if (!whatsapp_number || !code) {
            return NextResponse.json({ error: "Phone number and code are required" }, { status: 400 });
        }

        // 1. Fetch OTP from DB
        const { data: otp, error: otpError } = await supabase
            .from("vendor_otps")
            .select("*")
            .eq("phone", whatsapp_number)
            .single();

        if (otpError || !otp) {
            return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 401 });
        }

        // 2. Check if expired
        if (new Date(otp.expires_at) < new Date()) {
            return NextResponse.json({ error: "Verification code has expired" }, { status: 401 });
        }

        // 3. Verify code
        if (otp.code !== code) {
            return NextResponse.json({ error: "Incorrect verification code" }, { status: 401 });
        }

        // 4. Code is correct! Find the organization
        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("id, name")
            .eq("whatsapp_number", whatsapp_number)
            .single();

        if (orgError || !org) {
            return NextResponse.json({ error: "Associated organization not found" }, { status: 404 });
        }

        // 5. Success! Delete the OTP
        await supabase
            .from("vendor_otps")
            .delete()
            .eq("phone", whatsapp_number);

        return NextResponse.json({ orgId: org.id, name: org.name });
    } catch (e: any) {
        console.error("Verification error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
