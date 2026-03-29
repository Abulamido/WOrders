/**
 * Telegram Webhook Simulation Script
 * USAGE: node scripts/simulate-telegram-webhook.js {slug}
 */

// const fetch = require('node-fetch'); // Node 22 has global fetch
// dotenv and fetch handled by node native features or process
// USAGE: node --env-file=.env.local scripts/simulate-telegram-webhook.js {slug}

const WEBHOOK_URL = `http://localhost:3000/api/webhooks/telegram?secret=${process.env.TELEGRAM_WEBHOOK_SECRET}`;
const MOCK_CHAT_ID = 123456789;

async function sendUpdate(payload) {
    console.log(`Sending update: ${payload.message?.text || 'Payload'}`);
    const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await res.text();
    console.log(`Response: ${res.status} - ${data}`);
}

async function runTest() {
    const slug = process.argv[2] || 'test-cafe';
    
    console.log(`--- SIMULATING TELEGRAM FLOW FOR SLUG: ${slug} ---`);

    // 1. /start slug
    await sendUpdate({
        update_id: 10001,
        message: {
            message_id: 1,
            from: { id: MOCK_CHAT_ID, first_name: 'Test', last_name: 'User' },
            chat: { id: MOCK_CHAT_ID, type: 'private' },
            date: Date.now(),
            text: `/start ${slug}`
        }
    });

    // 2. Share Contact
    await sendUpdate({
        update_id: 10002,
        message: {
            message_id: 2,
            from: { id: MOCK_CHAT_ID, first_name: 'Test', last_name: 'User' },
            chat: { id: MOCK_CHAT_ID, type: 'private' },
            date: Date.now(),
            contact: {
                phone_number: '+15550001111',
                first_name: 'Test',
                user_id: MOCK_CHAT_ID
            }
        }
    });

    // 3. Callback: menu (We'll use a known org id for Abu Cafe)
    const orgId = '87cfd891-85ef-4411-b240-d90bdf3bee42'; 
    await sendUpdate({
        update_id: 10003,
        callback_query: {
            id: 'cb1',
            from: { id: MOCK_CHAT_ID },
            message: { chat: { id: MOCK_CHAT_ID }, message_id: 100 },
            data: `menu:${orgId}:`
        }
    });

    console.log('--- Finished Simulation ---');
}

runTest().catch(console.error);
