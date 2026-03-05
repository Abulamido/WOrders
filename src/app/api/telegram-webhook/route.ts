import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { TelegramUpdate, TelegramCallbackQuery, TelegramMessage, TelegramUser } from "@/types/telegram";
import { validateWebhookSecret } from "@/lib/telegram/security";

export async function POST(request: NextRequest) {
    try {
        // Validate webhook secret
        const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
        if (!validateWebhookSecret(secret)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const update: TelegramUpdate = await request.json();

        // Handle button clicks
        if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
        }

        // Handle commands (/start, /unsubscribe)
        if (update.message?.text?.startsWith("/")) {
            await handleCommand(update.message);
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Telegram Webhook error:", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}

async function handleCallbackQuery(query: TelegramCallbackQuery) {
    const supabase = createServiceClient();
    const [action, coverageId] = query.data.split(":");
    const chatId = query.message!.chat.id;
    const messageId = query.message!.message_id;
    const user = query.from;

    if (action === "COVER_ACCEPT") {
        await handleCoverAccept(supabase, coverageId, user, chatId, messageId);
    } else if (action === "COVER_DECLINE") {
        await handleCoverDecline(user, chatId, messageId);
    }

    // Answer callback to remove loading spinner in Telegram UI
    await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: query.id })
        }
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCoverAccept(supabase: any, coverageId: string, user: TelegramUser, chatId: number, messageId: number) {
    // Check if still pending
    const { data: coverage } = await supabase
        .from("shift_coverage_requests")
        .select("original_shift_id, status, requester_id")
        .eq("id", coverageId)
        .single();

    if (!coverage || coverage.status !== "pending") {
        await editMessage(chatId, messageId, "⚠️ This shift is no longer available.");
        return;
    }

    // Try to find if user is linked in Supabase (we might not have auth.users match if not fully integrated, but we'll try)
    const { data: sub } = await supabase
        .from("telegram_subscriptions")
        .select("user_id")
        .eq("chat_id", chatId)
        .single();

    // We update accepted_by only if we have a valid UUID, otherwise null it.
    const userIdToSave = sub?.user_id || null;

    // Mark as covered
    await supabase
        .from("shift_coverage_requests")
        .update({
            status: "covered",
            accepted_by: userIdToSave,
            accepted_at: new Date().toISOString()
        })
        .eq("id", coverageId);

    // Update shift assignment
    if (userIdToSave) {
        await supabase
            .from("shift_assignments")
            .update({ user_id: userIdToSave })
            .eq("shift_id", coverage.original_shift_id);
    }

    // Update message to show covered
    const userName = user.first_name + (user.last_name ? ` ${user.last_name}` : "");
    await editMessage(chatId, messageId,
        `✅ *Shift Covered*\n\nAccepted by: ${userName}\nStatus: Assigned`
    );

    // Notify original requester
    if (coverage.requester_id) {
        const { data: requester } = await supabase
            .from("telegram_subscriptions")
            .select("chat_id")
            .eq("user_id", coverage.requester_id)
            .single();

        if (requester) {
            await sendMessage(requester.chat_id,
                `✅ Your coverage request has been accepted by ${userName}!`
            );
        }
    }
}

async function handleCoverDecline(user: TelegramUser, chatId: number, messageId: number) {
    const name = user.first_name;
    await editMessage(chatId, messageId,
        `❌ ${name} can't cover. Request still open for others.`
    );
}

async function handleCommand(message: TelegramMessage) {
    const supabase = createServiceClient();
    const text = message.text;
    const chatId = message.chat.id;
    const from = message.from!;

    if (text === "/start") {
        // Subscribe user
        await supabase.from("telegram_subscriptions").upsert(
            {
                chat_id: chatId,
                username: from.username,
                first_name: from.first_name,
                last_name: from.last_name,
                is_active: true
            },
            { onConflict: "chat_id" }
        );

        await sendMessage(chatId,
            "✅ *Subscribed!*\n\nYou will receive:\n• Shift reminders\n• Coverage requests\n• Schedule updates"
        );
    } else if (text === "/unsubscribe") {
        await supabase
            .from("telegram_subscriptions")
            .update({ is_active: false })
            .eq("chat_id", chatId);

        await sendMessage(chatId, "❌ Unsubscribed. Use /start to rejoin.");
    }
}

async function sendMessage(chatId: number, text: string) {
    await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
        }
    );
}

async function editMessage(chatId: number, messageId: number, text: string) {
    await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/editMessageText`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "Markdown" })
        }
    );
}

export async function GET() {
    return NextResponse.json({ status: "Webhook active", timestamp: new Date().toISOString() });
}
