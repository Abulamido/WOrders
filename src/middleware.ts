import { NextRequest, NextResponse } from 'next/server';
import { decrypt, SessionPayload } from '@/lib/auth';

const PROTECTED_ROUTES = [
    { path: '/dashboard', roles: ['vendor'] },
    { path: '/admin', roles: ['admin'] },
    { path: '/agency-dashboard', roles: ['agency'] },
];

const AUTH_PAGES = [
    '/login',
    '/admin/login',
    '/agency-dashboard/login',
];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // 1. Check if the route is protected
    const protection = PROTECTED_ROUTES.find(r => pathname.startsWith(r.path));
    
    // 2. Allow requests for static files and standard Next.js internal routes
    if (
        pathname.startsWith('/_next') || 
        pathname.startsWith('/api') || 
        pathname.startsWith('/static') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // 3. Handle protected routes
    if (protection) {
        const sessionToken = req.cookies.get('menuhorse_session')?.value;
        const session = sessionToken ? await decrypt(sessionToken) : null;

        // If no session, redirect to appropriate login
        if (!session) {
            let loginPath = '/login';
            if (pathname.startsWith('/admin')) loginPath = '/admin/login';
            if (pathname.startsWith('/agency-dashboard')) loginPath = '/agency-dashboard/login';
            
            const url = req.nextUrl.clone();
            url.pathname = loginPath;
            // Optionally add redirect=target back later
            return NextResponse.redirect(url);
        }

        // Check if role matches
        if (!protection.roles.includes(session.role)) {
            // Kick out to landing if role doesn't match
            const url = req.nextUrl.clone();
            url.pathname = '/';
            return NextResponse.redirect(url);
        }

        return NextResponse.next();
    }

    // 4. Handle auth pages (Redirect to dashboard if already logged in)
    if (AUTH_PAGES.includes(pathname)) {
        const sessionToken = req.cookies.get('menuhorse_session')?.value;
        const session = sessionToken ? await decrypt(sessionToken) : null;

        if (session) {
            let target = '/dashboard';
            if (session.role === 'admin') target = '/admin';
            if (session.role === 'agency') target = '/agency-dashboard';

            const url = req.nextUrl.clone();
            url.pathname = target;
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/dashboard/:path*', '/admin/:path*', '/agency-dashboard/:path*', '/login', '/admin/login', '/agency-dashboard/login'],
};
