import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { processMessage } from "@/lib/whatsapp-processor";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const logFile = path.join(process.cwd(), "webhook_debug.log");

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
    try {
        const rawBody = await req.text(); // Read raw string for signature verification
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
                fs.appendFileSync(logFile, `[${new Date().toISOString()}] Signature mismatch\n`);
                return new NextResponse("Invalid Signature", { status: 403 });
            }
        }

        const logMsg = `[${new Date().toISOString()}] Incoming POST\nRAW: ${rawBody}\n`;
        fs.appendFileSync(logFile, logMsg);

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
                fs.appendFileSync(logFile, `[${new Date().toISOString()}] Rate limited: ${fromPhone}\n`);
                return new NextResponse("Rate limit exceeded", { status: 429 });
            }

            // 3. Idempotency check 
            const { data: exists } = await supabase
                .from("webhook_logs")
                .select("id")
                .eq("message_id", messageId)
                .single();

            if (exists) {
                fs.appendFileSync(logFile, `[${new Date().toISOString()}] Duplicate message ID: ${messageId}\n`);
                return NextResponse.json({ status: "already_processed" });
            }

            // Pre-insert into webhook_logs to prevent race conditions during processing
            await supabase.from("webhook_logs").insert({ message_id: messageId });

            // Original generic logging
            const { error: logError } = await supabase.from("whatsapp_logs").insert({
                org_id: null as unknown as string,
                phone: fromPhone,
                direction: "incoming",
                payload: body as any,
                status: messageType,
            });

            if (logError) {
                fs.appendFileSync(logFile, `Supabase Log Error: ${JSON.stringify(logError)}\n`);
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
        fs.appendFileSync(logFile, errLog);
        console.error(errLog);
        return NextResponse.json({ status: "error" }, { status: 500 });
    }
}
