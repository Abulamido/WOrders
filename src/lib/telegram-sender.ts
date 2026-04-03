/**
 * Telegram Bot API message sender.
 * Handles sending text, inline keyboards, and photos.
 */

import { AsyncLocalStorage } from "node:async_hooks";

export const botContext = new AsyncLocalStorage<{ botToken?: string }>();

async function sendRequest(method: string, payload: Record<string, unknown>, botToken?: string) {
    const contextToken = botContext.getStore()?.botToken;
    const token = contextToken || botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        console.error("TELEGRAM_BOT_TOKEN is not defined in environment variables or passed explicitly");
        return { ok: false, error: "Missing bot token" };
    }

    const TELEGRAM_API_URL = `https://api.telegram.org/bot${token}`;
    const logMsg = `[${new Date().toISOString()}] Sending to Telegram (${method}): ${JSON.stringify(payload)}\n`;
    console.log(logMsg);

    try {
        const response = await fetch(`${TELEGRAM_API_URL}/${method}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => "Could not parse error JSON");
            const errLog = `Telegram API error: ${response.status} - ${JSON.stringify(errorData)}`;
            console.error(errLog);
            return { ok: false, error: errLog };
        }

        return response.json();
    } catch (error: any) {
        console.error(`Fetch to Telegram failed: ${error.message}`);
        return { ok: false, error: error.message };
    }
}

/** Send a plain text message */
export async function sendMessage(chatId: number | string, text: string, options: any = {}) {
    const { botToken, ...restOptions } = options;
    return sendRequest("sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        ...restOptions,
    }, botToken);
}

/** Send a photo with a caption */
export async function sendPhoto(chatId: number | string, photoUrl: string, caption?: string, options: any = {}) {
    const { botToken, ...restOptions } = options;
    return sendRequest("sendPhoto", {
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: "Markdown",
        ...restOptions,
    }, botToken);
}

/** Edit an existing message (useful for interactive flows) */
export async function editMessageText(chatId: number | string, messageId: number, text: string, options: any = {}) {
    const { botToken, ...restOptions } = options;
    return sendRequest("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "Markdown",
        ...restOptions,
    }, botToken);
}

/** Request user contact (phone number) */
export async function requestContact(chatId: number | string, text: string, options: any = {}) {
    const { botToken, ...restOptions } = options;
    return sendRequest("sendMessage", {
        chat_id: chatId,
        text,
        reply_markup: {
            keyboard: [
                [
                    {
                        text: "📱 Share Contact",
                        request_contact: true,
                    },
                ],
            ],
            one_time_keyboard: true,
            resize_keyboard: true,
        },
        ...restOptions,
    }, botToken);
}

/** Send an inline keyboard (for menu/cart/history) */
export async function sendInlineKeyboard(
    chatId: number | string,
    text: string,
    buttons: { text: string; callback_data: string }[][],
    options: any = {}
) {
    const { botToken, ...restOptions } = options;
    return sendRequest("sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: buttons,
        },
        ...restOptions,
    }, botToken);
}

/** Answer a callback query (to remove the loading state from buttons) */
export async function answerCallbackQuery(callbackQueryId: string, text?: string, options: any = {}) {
    const { botToken, ...restOptions } = options;
    return sendRequest("answerCallbackQuery", {
        callback_query_id: callbackQueryId,
        text,
        ...restOptions,
    }, botToken);
}
