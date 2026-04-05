/**
 * WhatsApp message sender via Green API.
 * Replaces the Meta Cloud API sender with Green API endpoints.
 * 
 * Green API docs: https://green-api.com/en/docs/api/sending/SendMessage/
 * Chat ID format: "79876543210@c.us" for personal chats
 */

function getBaseUrl() {
    const GREENAPI_ID = process.env.GREENAPI_ID_INSTANCE || "";
    return `https://api.green-api.com/waInstance${GREENAPI_ID}`;
}

/** Convert phone number to Green API chatId format */
function toChatId(phone: string): string {
    // Already in chatId format
    if (phone.endsWith("@c.us") || phone.endsWith("@g.us")) return phone;
    // Strip leading + if present
    const cleaned = phone.replace(/^\+/, "").replace(/\D/g, "");
    return `${cleaned}@c.us`;
}

/** Generic Green API request helper */
async function greenApiRequest(method: string, payload: Record<string, unknown>) {
    const GREENAPI_TOKEN = process.env.GREENAPI_API_TOKEN || "";
    const url = `${getBaseUrl()}/${method}/${GREENAPI_TOKEN}`;


    console.log(`[GreenAPI] ${method}:`, JSON.stringify(payload));

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text();
        let errorData;
        try { errorData = JSON.parse(text); } catch { errorData = text; }
        const errMsg = `Green API error (${method}): ${response.status} - ${typeof errorData === 'object' ? JSON.stringify(errorData) : errorData}`;
        console.error(errMsg);
        throw new Error(errMsg);
    }

    const resText = await response.text();
    try {
        return JSON.parse(resText);
    } catch {
        return resText;
    }
}

/** Send a plain text message */
export async function sendTextMessage(to: string, text: string) {
    return greenApiRequest("sendMessage", {
        chatId: toChatId(to),
        message: text,
    });
}

/** 
 * Send a "button" message as numbered text menu.
 * Green API (non-WABA) doesn't support interactive buttons,
 * so we render them as a numbered list the user replies to.
 */
export async function sendButtonMessage(
    to: string,
    bodyText: string,
    buttons: { id: string; title: string }[]
) {
    const optionLines = buttons.map((btn, i) => `${i + 1}. ${btn.title}`).join("\n");
    const fullMessage = `${bodyText}\n\n${optionLines}\n\n_Reply with a number to choose._`;

    return greenApiRequest("sendMessage", {
        chatId: toChatId(to),
        message: fullMessage,
    });
}

/**
 * Send a "list" message as numbered text menu.
 * Flattens all sections into a single numbered list.
 */
export async function sendListMessage(
    to: string,
    bodyText: string,
    _buttonTitle: string,
    sections: {
        title: string;
        rows: { id: string; title: string; description?: string }[];
    }[]
) {
    let counter = 0;
    const sectionTexts = sections.map((section) => {
        const rowLines = section.rows.map((row) => {
            counter++;
            const desc = row.description ? ` — ${row.description}` : "";
            return `${counter}. ${row.title}${desc}`;
        }).join("\n");
        return `*${section.title}*\n${rowLines}`;
    }).join("\n\n");

    const fullMessage = `${bodyText}\n\n${sectionTexts}\n\n_Reply with a number to choose._`;

    return greenApiRequest("sendMessage", {
        chatId: toChatId(to),
        message: fullMessage,
    });
}

/** Send an image message via URL */
export async function sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string
) {
    return greenApiRequest("sendFileByUrl", {
        chatId: toChatId(to),
        urlFile: imageUrl,
        fileName: "image.jpg",
        caption: caption || "",
    });
}

/** Mark a chat as read */
export async function markAsRead(messageId: string) {
    // Green API uses ReadChat with chatId, not message ID.
    // We'll silently skip this since we don't have chatId here.
    // The webhook handler can call this directly if needed.
    console.log(`[GreenAPI] markAsRead skipped for messageId: ${messageId}`);
}

/** Mark a specific chat as read (call from webhook where we have chatId) */
export async function markChatAsRead(chatId: string) {
    try {
        await greenApiRequest("readChat", {
            chatId: toChatId(chatId),
        });
    } catch (e) {
        console.warn("[GreenAPI] markChatAsRead failed:", e);
    }
}
