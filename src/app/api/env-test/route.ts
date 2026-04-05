import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        vercelEnv: process.env.VERCEL_ENV,
        greenApiId: process.env.GREENAPI_ID_INSTANCE || "MISSING",
        greenApiToken: process.env.GREENAPI_API_TOKEN ? "EXISTS" : "MISSING",
        nodeEnv: process.env.NODE_ENV,
    });
}
