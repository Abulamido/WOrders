"use client";

import React, { createContext, useContext, ReactNode } from "react";
import type { BrandConfig } from "./brand";

// Assuming we provide a default during module loading, though we'll hydrate it from context
import { DEFAULT_BRAND } from "./brand";

const BrandContext = createContext<BrandConfig>(DEFAULT_BRAND);

export function BrandProvider({
    brand,
    children,
}: {
    brand?: BrandConfig;
    children: ReactNode;
}) {
    // Fallback to DEFAULT_BRAND if none is provided via props
    return (
        <BrandContext.Provider value={brand || DEFAULT_BRAND}>
            {children}
        </BrandContext.Provider>
    );
}

export function useBrand() {
    return useContext(BrandContext);
}
