// Local test for GreenAPI

require('dotenv').config({ path: '.env.local' });

const GREENAPI_ID = process.env.GREENAPI_ID_INSTANCE || "7107576555";
const GREENAPI_TOKEN = process.env.GREENAPI_API_TOKEN || "7f097c7cc9a5439f85c9b11f756a9809e95c983907bf4d1c98";

async function greenApiRequest(method, payload) {
    const url = `https://api.green-api.com/waInstance${GREENAPI_ID}/${method}/${GREENAPI_TOKEN}`;
    console.log("POST", url, payload);
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`ERROR: ${response.status} - ${text}`);
    } else {
        console.log("SUCCESS:", await response.text());
    }
}

greenApiRequest("sendMessage", {
    chatId: "2347019970002@c.us", // the user's phone from the logs
    message: "Test message from local"
});
