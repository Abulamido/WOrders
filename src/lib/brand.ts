import type { Agency } from "@/types/database";

export interface BrandConfig {
    name: string;
    icon: string;
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    telegramBotUsername: string | null;
    telegramBotToken: string | null;
    supportEmail: string | null;
    agencyId: string | null;
    // We omit Stripe Connect fields for now based on user preference to stick to single account first
}

export const DEFAULT_BRAND: BrandConfig = {
    name: "MenuFlow",
    icon: "🌊",
    logoUrl: "/logo.png",
    primaryColor: "#0d9488",    // Teal-600
    secondaryColor: "#a3e635",  // Lemon Green (Lime-400)
    telegramBotUsername: "MenuFlowBot",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || null,
    supportEmail: "support@menuflow.app",
    agencyId: null,
};

/**
 * Helper to convert an Agency DB row into a BrandConfig object.
 */
export function createBrandFromAgency(agency: Agency): BrandConfig {
    return {
        name: agency.brand_name,
        icon: agency.brand_icon,
        logoUrl: agency.brand_logo_url,
        primaryColor: agency.brand_primary_color,
        secondaryColor: agency.brand_secondary_color,
        telegramBotUsername: agency.telegram_bot_username,
        telegramBotToken: agency.telegram_bot_token,
        supportEmail: agency.support_email,
        agencyId: agency.id,
    };
}
