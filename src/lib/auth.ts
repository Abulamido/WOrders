import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Custom Web-Crypto based session signing (Edge compatible)
 * This avoids dependency on 'jose' or other external libs.
 */

const SECRET_KEY = process.env.JWT_SECRET || 'fallback-secret-change-me-in-production';

// Encode a string to a Uint8Array
const key = new TextEncoder().encode(SECRET_KEY);

export interface SessionPayload {
    userId?: string;
    orgId?: string;
    agencyId?: string;
    role: 'admin' | 'agency' | 'vendor';
    phoneNumber?: string;
    expires: number;
}

/**
 * Simple HMAC-SHA256 signature for the session 
 */
async function sign(payload: SessionPayload): Promise<string> {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const data = btoa(JSON.stringify(payload));
    const cryptoKey = await crypto.subtle.importKey(
        'raw', 
        key, 
        { name: 'HMAC', hash: 'SHA-256' }, 
        false, 
        ['sign']
    );
    
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(`${header}.${data}`));
    const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));
    
    return `${header}.${data}.${signature}`;
}

/**
 * Verify HMAC-SHA256 signature and return payload
 */
export async function decrypt(token: string): Promise<SessionPayload | null> {
    try {
        const [header, data, signature] = token.split('.');
        if (!header || !data || !signature) return null;

        const cryptoKey = await crypto.subtle.importKey(
            'raw', 
            key, 
            { name: 'HMAC', hash: 'SHA-256' }, 
            false, 
            ['verify']
        );

        // Convert base64 to Uint8Array for verification
        const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
        const dataBytes = new TextEncoder().encode(`${header}.${data}`);

        const isValid = await crypto.subtle.verify(
            'HMAC',
            cryptoKey,
            sigBytes,
            dataBytes
        );

        if (!isValid) return null;
        
        const payload = JSON.parse(atob(data)) as SessionPayload;
        if (payload.expires < Date.now()) return null; // Expired
        
        return payload;
    } catch (e) {
        return null;
    }
}

/**
 * Helper to set the session cookie.
 */
export async function setSessionCookie(payload: Omit<SessionPayload, 'expires'>) {
    const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    const session = await sign({ ...payload, expires });

    const cookieStore = await cookies();
    cookieStore.set('menuhorse_session', session, {
        expires: new Date(expires),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
    });
}

/**
 * Helper to get the session from a request.
 */
export async function getSession(req?: NextRequest) {
    let session: string | undefined;
    
    if (req) {
        session = req.cookies.get('menuflow_session')?.value;
    } else {
        const cookieStore = await cookies();
        session = cookieStore.get('menuflow_session')?.value;
    }
    
    if (!session) return null;
    return await decrypt(session);
}

/**
 * Clears the session cookie.
 */
export async function logout() {
    const cookieStore = await cookies();
    cookieStore.set('menuflow_session', '', { expires: new Date(0), path: '/' });
}
