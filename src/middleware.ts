import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServiceClient } from "./lib/supabase";
import { DEFAULT_BRAND, createBrandFromAgency } from "./lib/brand";

// Common domains that should resolve to default brand without hitting DB
const DEFAULT_DOMAINS = ["localhost", "127.0.0.1", "cafeteriaflow.com", "www.cafeteriaflow.com", "w-orders.vercel.app"];

export async function middleware(req: NextRequest) {
    const url = req.nextUrl;
    // Get hostname (e.g. fooddash.cafeteriaflow.com, orders.fooddash.com, localhost:3000)
    let hostname = req.headers.get("host") || "";

    // Remove port if present
    hostname = hostname.split(":")[0];

    // Determine the subdomain/slug
    // For localhost testing, we might consider testing local subdomains via /etc/hosts, 
    // or passing a specific custom header for local dev simulation.
    let agencySlug: string | null = null;
    let customDomain: string | null = null;

    if (!DEFAULT_DOMAINS.includes(hostname)) {
        // Simple heuristic: if it ends with a known root domain like .vercel.app or .cafeteriaflow.com, it's a subdomain.
        // Otherwise, assume it's a custom domain.
        if (hostname.endsWith("w-orders.vercel.app") || hostname.endsWith("cafeteriaflow.com")) {
            const parts = hostname.split(".");
            // Example: fooddash.cafeteriaflow.com -> parts = ["fooddash", "cafeteriaflow", "com"]
            if (parts.length > 2) {
                agencySlug = parts[0];
            }
        } else {
            customDomain = hostname;
        }
    }

    let brandConfig = DEFAULT_BRAND;

    if (agencySlug || customDomain) {
        // Query Supabase for the agency. Using Service Role to bypass RLS in middleware.
        const supabase = createServiceClient();
        
        let query = supabase.from("agencies").select("*").eq("is_active", true);
        
        if (customDomain) {
            query = query.eq("custom_domain", customDomain);
        } else if (agencySlug) {
            query = query.eq("slug", agencySlug);
        }

        const { data: agency } = await query.single();

        if (agency) {
            brandConfig = createBrandFromAgency(agency);
        }
    }

    // Rewrite the request, adding the serialized brand config to headers.
    // This allows Server Components to read the brand from headers() directly,
    // avoiding another DB trip.
    const res = NextResponse.next();
    res.headers.set("x-brand-config", encodeURIComponent(JSON.stringify(brandConfig)));

    return res;
}

export const config = {
    // Only run middleware on HTML pages, excluding static files, API routes, and Next.js internals
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"
    ],
};
