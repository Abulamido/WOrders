import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { processMessage } from "@/lib/whatsapp-processor";
import fs from "fs";
import path from "path";

const logFile = path.join(process.cwd(), "webhook_debug.log");

/**
 * GET — Meta webhook verification.
 * Meta sends a GET request with hub.mode, hub.verify_token, and hub.challenge.
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
 * Meta sends message events here. We log them and process.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const supabase = createServiceClient();

        const logMsg = `[${new Date().toISOString()}] Incoming POST\nRAW: ${JSON.stringify(body)}\n`;
        fs.appendFileSync(logFile, logMsg);

        // Log the raw webhook payload
        const messageType =
            body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type || "unknown";

        const { error: logError } = await supabase.from("whatsapp_logs").insert({
            org_id: null as unknown as string,
            phone: body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || null,
            direction: "incoming",
            payload: body as any,
            status: messageType,
        });

        if (logError) {
            fs.appendFileSync(logFile, `Supabase Log Error: ${JSON.stringify(logError)}\n`);
        }

        // Process each message
        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                const messages = change.value?.messages || [];
                for (const message of messages) {
                    await processMessage(message, change.value.metadata);
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

