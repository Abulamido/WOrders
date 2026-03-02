import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conflict resolution */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/** Format currency value */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

/** Format relative time (e.g., "5 min ago") */
export function formatRelativeTime(date: Date | string): string {
    const now = new Date();
    const d = typeof date === "string" ? new Date(date) : date;
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
}

/** Generate a short order display ID */
export function shortOrderId(uuid: string): string {
    return `#${uuid.slice(0, 6).toUpperCase()}`;
}

/** Capitalize first letter */
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
