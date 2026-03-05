import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { TelegramUpdate, TelegramCallbackQuery, TelegramMessage, TelegramUser } from "@/types/telegram";
import { validateWebhookSecret } from "@/lib/telegram/security";
import { processTelegramCommand, processTelegramCallback } from "@/lib/telegram/processor";

export async function POST(request: NextRequest) {
    try {
        const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
        if (!validateWebhookSecret(secret)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const update: TelegramUpdate = await request.json();

        // ── Inline keyboard button presses ──────────────────────────────────
        if (update.callback_query) {
            const query = update.callback_query;
            const chatId = query.message!.chat.id;
            const messageId = query.message!.message_id;
            const firstName = query.from.first_name;
            const data = query.data;

            // Shift-coverage actions use colon-separated format: "COVER_ACCEPT:uuid"
            if (data.startsWith("COVER_")) {
                await handleCoverageCallback(query);
            } else {
                // Everything else is an ordering action
                await processTelegramCallback(chatId, messageId, query.id, data, firstName);
            }
        }

        // ── Incoming text messages / commands ───────────────────────────────
        if (update.message?.text) {
            const msg = update.message;
            const chatId = msg.chat.id;
            const text = msg.text!;
            const from = msg.from!;

            // Handle /unsubscribe separately (subscription management)
            if (text === "/unsubscribe") {
                await handleUnsubscribe(chatId);
            } else {
                // All other text (incl. /start, /menu, hi, etc.) → order flow
                await processTelegramCommand(chatId, text, from.first_name);
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Telegram Webhook error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

// ─── Shift Coverage Handlers ─────────────────────────────────────────────────

async function handleCoverageCallback(query: TelegramCallbackQuery) {
    const supabase = createServiceClient();
    const [action, coverageId] = query.data.split(":");
    const chatId = query.message!.chat.id;
    const messageId = query.message!.message_id;
    const user = query.from;

    if (action === "COVER_ACCEPT") {
        await handleCoverAccept(supabase, coverageId, user, chatId, messageId);
    } else if (action === "COVER_DECLINE") {
        const name = user.first_name;
        await tgEdit(chatId, messageId, `❌ ${name} can't cover. Request still open for others.`);
    }

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: query.id }),
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCoverAccept(supabase: any, coverageId: string, user: TelegramUser, chatId: number, messageId: number) {
    const { data: coverage } = await supabase
        .from("shift_coverage_requests")
        .select("original_shift_id, status, requester_id")
        .eq("id", coverageId)
        .single();

    if (!coverage || coverage.status !== "pending") {
        await tgEdit(chatId, messageId, "⚠️ This shift is no longer available.");
        return;
    }

    const { data: sub } = await supabase
        .from("telegram_subscriptions")
        .select("user_id")
        .eq("chat_id", chatId)
        .single();

    const userIdToSave = sub?.user_id || null;

    await supabase.from("shift_coverage_requests").update({
        status: "covered",
        accepted_by: userIdToSave,
        accepted_at: new Date().toISOString(),
    }).eq("id", coverageId);

    if (userIdToSave) {
        await supabase.from("shift_assignments").update({ user_id: userIdToSave }).eq("shift_id", coverage.original_shift_id);
    }

    const userName = user.first_name + (user.last_name ? ` ${user.last_name}` : "");
    await tgEdit(chatId, messageId, `✅ *Shift Covered*\n\nAccepted by: ${userName}\nStatus: Assigned`);

    if (coverage.requester_id) {
        const { data: requester } = await supabase.from("telegram_subscriptions").select("chat_id").eq("user_id", coverage.requester_id).single();
        if (requester) await tgSend(requester.chat_id, `✅ Your coverage request has been accepted by ${userName}!`);
    }
}

async function handleUnsubscribe(chatId: number) {
    const supabase = createServiceClient();
    await supabase.from("telegram_subscriptions").update({ is_active: false }).eq("chat_id", chatId);
    await tgSend(chatId, "❌ Unsubscribed from shift alerts. Use /start to rejoin anytime.");
}

// ─── Lightweight Telegram API helpers (for coverage messages) ─────────────────

async function tgSend(chatId: number, text: string) {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
}

async function tgEdit(chatId: number, messageId: number, text: string) {
    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "Markdown" }),
    });
}

export async function GET() {
    return NextResponse.json({ status: "Webhook active", timestamp: new Date().toISOString() });
}
