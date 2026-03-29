/**
 * WhatsApp Cloud API message sender.
 * Handles sending text, button, and list messages via Meta API.
 */



async function sendRequest(payload: Record<string, unknown>) {
    const WHATSAPP_API_URL = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const logMsg = `[${new Date().toISOString()}] Sending to Meta: ${JSON.stringify(payload)}\n`;
    console.log(logMsg);

    const response = await fetch(WHATSAPP_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            errorData = "Could not parse error JSON";
        }
        const errLog = `WhatsApp API error: ${response.status} - ${JSON.stringify(errorData)}`;
        console.error(errLog);
        throw new Error(errLog);
    }

    return response.json();
}


/** Send a plain text message */
export async function sendTextMessage(to: string, text: string) {
    return sendRequest({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
    });
}

/** Send an interactive button message (max 3 buttons) */
export async function sendButtonMessage(
    to: string,
    bodyText: string,
    buttons: { id: string; title: string }[]
) {
    return sendRequest({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "button",
            body: { text: bodyText },
            action: {
                buttons: buttons.map((btn) => ({
                    type: "reply",
                    reply: { id: btn.id, title: btn.title.slice(0, 20) },
                })),
            },
        },
    });
}

/** Send an interactive list message (max 10 items per section) */
export async function sendListMessage(
    to: string,
    bodyText: string,
    buttonTitle: string,
    sections: {
        title: string;
        rows: { id: string; title: string; description?: string }[];
    }[]
) {
    return sendRequest({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
            type: "list",
            body: { text: bodyText },
            action: {
                button: buttonTitle.slice(0, 20),
                sections,
            },
        },
    });
}

/** Send an image message */
export async function sendImageMessage(
    to: string,
    imageUrl: string,
    caption?: string
) {
    return sendRequest({
        messaging_product: "whatsapp",
        to,
        type: "image",
        image: { link: imageUrl, caption },
    });
}

/** Mark a message as read */
export async function markAsRead(messageId: string) {
    return sendRequest({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
    });
}
