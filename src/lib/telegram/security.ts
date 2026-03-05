// src/lib/telegram/security.ts
export function validateWebhookSecret(secret: string | null): boolean {
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!expected) {
        console.warn('TELEGRAM_WEBHOOK_SECRET not set in environment variables');
        // In development, we might allow it, but in production we should reject.
        // For the MVP soft launch, we'll return false if it's not set to enforce security.
        return false;
    }
    return secret === expected;
}

const requests = new Map<string, number>();

export function checkRateLimit(key: string, max: number = 30, windowMs: number = 60000): boolean {
    const now = Date.now();
    const entry = requests.get(key);

    if (!entry || now - entry > windowMs) {
        requests.set(key, now);
        return true;
    }

    return false;
}
