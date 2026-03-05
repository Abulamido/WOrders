import { CoverageRequestData } from "@/types/telegram";

export async function sendCoverageRequest(chatId: number, data: CoverageRequestData) {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    const inlineKeyboard = {
        inline_keyboard: [
            [
                { text: "✅ I Can Cover", callback_data: `COVER_ACCEPT:${data.coverage_id}` },
                { text: "❌ Can't Cover", callback_data: `COVER_DECLINE:${data.coverage_id}` }
            ],
            [
                { text: "📅 View Schedule", url: "https://your-domain.vercel.app/schedule" }
            ]
        ]
    };

    const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: `🚨 *Coverage Needed*\n\n📅 Date: ${data.shift_date}\n🕐 Time: ${data.shift_time}\n📍 Location: ${data.location}\n👤 Requested by: ${data.requester_name}`,
                parse_mode: "Markdown",
                reply_markup: inlineKeyboard
            })
        }
    );

    const result = await response.json();
    return result.result?.message_id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function broadcastCoverageRequest(userIds: string[], coverageData: CoverageRequestData, supabase: any) {
    const { data: subscriptions } = await supabase
        .from("telegram_subscriptions")
        .select("chat_id")
        .in("user_id", userIds)
        .eq("is_active", true);

    const results = [];
    for (const sub of subscriptions || []) {
        try {
            const msgId = await sendCoverageRequest(sub.chat_id, coverageData);
            results.push({ chat_id: sub.chat_id, message_id: msgId, status: "sent" });
        } catch (error: Error | unknown) {
            results.push({ chat_id: sub.chat_id, error: error instanceof Error ? error.message : String(error), status: "failed" });
        }
    }

    return results;
}

export async function sendShiftReminder(chatId: number, shift: { date: string; time: string; location: string }) {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

    await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text: `⏰ *Shift Starting Soon*\n\n📅 ${shift.date}\n🕐 ${shift.time}\n📍 ${shift.location}`,
                parse_mode: "Markdown"
            })
        }
    );
}
