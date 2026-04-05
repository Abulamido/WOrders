import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { processMessage } from "@/lib/whatsapp-processor";
import { markChatAsRead } from "@/lib/whatsapp-sender";

/**
 * Green API Webhook Handler
 * 
 * Receives incoming WhatsApp messages from Green API and translates
 * them into the format expected by our WhatsApp processor.
 * 
 * Green API webhook docs:
 * https://green-api.com/en/docs/api/receiving/technology-webhook-endpoint/
 */

// Basic in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(phone: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = 15;

    const record = rateLimitMap.get(phone);
    if (!record || now > record.resetAt) {
        rateLimitMap.set(phone, { count: 1, resetAt: now + windowMs });
        return true;
    }

    record.count += 1;
    return record.count <= maxRequests;
}

/** Extract phone number from Green API chatId (e.g. "2348012345678@c.us" → "2348012345678") */
function fromChatId(chatId: string): string {
    return chatId.replace("@c.us", "").replace("@g.us", "");
}

/**
 * POST — Receive incoming Green API webhooks
 */
export async function POST(req: NextRequest) {
    console.log("DEBUG: Green API webhook POST received");
    
    try {
        const body = await req.json();
        console.log("DEBUG: Green API payload:", JSON.stringify(body).slice(0, 500));

        const { typeWebhook, senderData, messageData, idMessage } = body;

        // Only process incoming messages
        if (typeWebhook !== "incomingMessageReceived") {
            console.log(`Ignoring webhook type: ${typeWebhook}`);
            return NextResponse.json({ status: "ok" });
        }

        if (!senderData || !messageData) {
            return NextResponse.json({ status: "ok" });
        }

        const chatId = senderData.chatId as string;
        const senderPhone = fromChatId(chatId);

        // Skip group messages
        if (chatId.endsWith("@g.us")) {
            console.log("Skipping group message");
            return NextResponse.json({ status: "ok" });
        }

        // Rate limit
        if (!checkRateLimit(senderPhone)) {
            console.warn(`Rate limited: ${senderPhone}`);
            return NextResponse.json({ status: "rate_limited" }, { status: 429 });
        }

        // Mark chat as read (non-blocking)
        markChatAsRead(chatId).catch(() => {});

        // Log to Supabase
        const supabase = createServiceClient();
        await supabase.from("whatsapp_logs").insert({
            org_id: null as unknown as string,
            phone: senderPhone,
            direction: "incoming",
            payload: body as any,
            status: messageData.typeMessage || "unknown",
        }).then(({ error }) => {
            if (error) console.error("Supabase log error:", error);
        });

        // --- Translate Green API format → our processMessage format ---
        
        let translatedMessage: {
            from: string;
            id: string;
            type: string;
            text?: { body: string };
            interactive?: {
                type: string;
                button_reply?: { id: string; title: string };
                list_reply?: { id: string; title: string };
            };
        };

        const msgType = messageData.typeMessage as string;

        if (msgType === "textMessage") {
            // Plain text message
            translatedMessage = {
                from: senderPhone,
                id: idMessage || `ga_${Date.now()}`,
                type: "text",
                text: { body: messageData.textMessageData?.textMessage || "" },
            };
        } else if (msgType === "extendedTextMessage") {
            // Text with URL preview
            translatedMessage = {
                from: senderPhone,
                id: idMessage || `ga_${Date.now()}`,
                type: "text",
                text: { body: messageData.extendedTextMessageData?.text || "" },
            };
        } else if (msgType === "quotedMessage") {
            // Reply/quoted message — extract the text
            translatedMessage = {
                from: senderPhone,
                id: idMessage || `ga_${Date.now()}`,
                type: "text",
                text: { body: messageData.extendedTextMessageData?.text || messageData.textMessageData?.textMessage || "" },
            };
        } else {
            // Unsupported message type (image, audio, etc.) — ignore gracefully
            console.log(`Unsupported Green API message type: ${msgType}`);
            return NextResponse.json({ status: "ok" });
        }

        // Our WhatsApp number (the instance's own number)
        const instanceWid = body.instanceData?.wid || "";
        const businessNumber = fromChatId(instanceWid);

        await processMessage(translatedMessage, {
            display_phone_number: businessNumber,
        });

        return NextResponse.json({ status: "ok" });
    } catch (error: any) {
        console.error("CRITICAL GREEN API WEBHOOK ERROR:", error.message, error.stack);
        
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
            console.error("Failed to log error to DB:", dbError);
        }

        return NextResponse.json({ status: "error" }, { status: 500 });
    }
}

/**
 * GET — Simple health check for the webhook endpoint
 */
export async function GET() {
    return NextResponse.json({ status: "Green API webhook active" });
}
