import { NextRequest, NextResponse } from "next/server";
import { processTelegramUpdate } from "@/lib/telegram-processor";
import { botContext } from "@/lib/telegram-sender";
import { createServiceClient } from "@/lib/supabase";

/**
 * POST — Receive incoming Telegram updates.
 * Security: Use a secret token in the URL or check X-Telegram-Bot-Api-Secret-Token header.
 */
export async function POST(req: NextRequest) {
    console.log("DEBUG: Telegram Webhook POST received");
    
    try {
        const secret = req.nextUrl.searchParams.get("secret");
        const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

        // 1. Basic security check
        if (expectedSecret && secret !== expectedSecret) {
            console.warn("Unauthorized Telegram webhook attempt");
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Clone the request to avoid "body already read" errors
        const body = await req.clone().json();
        console.log("DEBUG: Telegram Payload Received");

        // 2. Fetch specific bot token if bot_id is provided
        const botId = req.nextUrl.searchParams.get("bot_id");
        let agencyBotToken: string | undefined = undefined;

        if (botId) {
            const supabase = createServiceClient();
            const { data: agency } = await supabase.from("agencies").select("telegram_bot_token").eq("slug", botId).single();
            if (agency?.telegram_bot_token) {
                agencyBotToken = agency.telegram_bot_token;
            }
        }

        // 3. Process the update asynchronously wrapped in the bot context
        await botContext.run({ botToken: agencyBotToken }, async () => {
            await processTelegramUpdate(body);
        });

        return NextResponse.json({ status: "ok" });
    } catch (error: any) {
        console.error("TELEGRAM WEBHOOK ERROR:", error.message);
        return NextResponse.json({ 
            status: "error", 
            message: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
}

/**
 * GET — Health check / Manual status.
 */
export async function GET() {
    return new NextResponse("Telegram Webhook Active", { status: 200 });
}
