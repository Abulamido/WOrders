import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { processMessage } from "@/lib/whatsapp-processor";
import crypto from "crypto";

// Basic in-memory rate limiting (max 10 requests per minute per phone)
// Note: In a true serverless environment, this resets per edge function instance. 
// For a fully distributed setup, Redis (e.g. Upstash) would be ideal.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(phone: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 10;

    const record = rateLimitMap.get(phone);
    if (!record || now > record.resetAt) {
        rateLimitMap.set(phone, { count: 1, resetAt: now + windowMs });
        return true;
    }

    record.count += 1;
    if (record.count > maxRequests) {
        return false;
    }
    return true;
}

/**
 * GET — Meta webhook verification.
 */
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (
        mode === "subscribe" &&
        token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    ) {
        console.log("WhatsApp webhook verified");
        return new NextResponse(challenge, { status: 200 });
    }

    return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST — Receive incoming WhatsApp messages.
 */
export async function POST(req: NextRequest) {
    console.log("DEBUG: Webhook POST received");
    try {
        const rawBody = await req.text(); // Read raw string for signature verification
        console.log("DEBUG: Raw Body:", rawBody);
        let body;

        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ status: "invalid_json" }, { status: 400 });
        }

        const supabase = createServiceClient();
        const appSecret = process.env.WHATSAPP_APP_SECRET || "";

        // 1. Verify Meta signature
        if (appSecret) {
            const signature = req.headers.get('x-hub-signature-256');
            if (!signature) {
                return new NextResponse("Missing Signature", { status: 403 });
            }

            const expected = crypto
                .createHmac('sha256', appSecret)
                .update(rawBody)
                .digest('hex');

            if (signature !== `sha256=${expected}`) {
                console.error("Signature mismatch");
                return new NextResponse("Invalid Signature", { status: 403 });
            }
        }

        const logMsg = `[${new Date().toISOString()}] Incoming POST\nRAW: ${rawBody}\n`;
        console.log(logMsg);

        // Extract metadata safely
        const messageType = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type || "unknown";
        const messageId = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id;
        const fromPhone = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || null;

        if (!messageId && !body.entry?.[0]?.changes?.[0]?.value?.statuses) {
            // Not a standard message or status event
            return NextResponse.json({ status: "ok" });
        }

        if (messageId) {
            // 2. Rate limiting check
            if (fromPhone && !checkRateLimit(fromPhone)) {
                console.warn(`Rate limited: ${fromPhone}`);
                return new NextResponse("Rate limit exceeded", { status: 429 });
            }

            // 3. Temporarily bypassed Idempotency check for MVP
            // (The webhook_logs table does not exist in the current schema)
            console.log(`Processing message ID: ${messageId}`);

            // Original generic logging
            const { error: logError } = await supabase.from("whatsapp_logs").insert({
                org_id: null as unknown as string,
                phone: fromPhone,
                direction: "incoming",
                payload: body as any,
                status: messageType,
            });

            if (logError) {
                console.error("Supabase Log Error:", logError);
            }

            // 4. Process each message
            for (const entry of body.entry || []) {
                for (const change of entry.changes || []) {
                    const messages = change.value?.messages || [];
                    for (const message of messages) {
                        await processMessage(message, change.value.metadata);
                    }
                }
            }
        }

        return NextResponse.json({ status: "ok" });
    } catch (error: any) {
        const errLog = `CRITICAL WEBHOOK ERROR: ${error.message}\n${error.stack}\n`;
        console.error(errLog);

        try {
            const supabase = createServiceClient();
            await supabase.from("whatsapp_logs").insert({
                org_id: null as unknown as string,
                phone: "DEBUG",
                direction: "incoming",
                payload: { error_msg: error.message, stack: String(error.stack) } as any,
                status: "CRASH",
            });
        } catch (dbError) {
            console.error("Failed to write to DB:", dbError);
        }

        return NextResponse.json({ status: "error" }, { status: 500 });
    }
}
