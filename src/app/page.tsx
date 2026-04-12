import Link from "next/link";
import { headers } from "next/headers";
import { cn } from "@/lib/utils";
import { DEFAULT_BRAND } from "@/lib/brand";
import { CheckCircle2, ArrowRight, Store, Smartphone, Zap } from "lucide-react";

export default async function LandingPage() {
  const headersList = await headers();
  const brandHeader = headersList.get("x-brand-config");
  let brand = DEFAULT_BRAND;

  if (brandHeader) {
    try {
      brand = JSON.parse(decodeURIComponent(brandHeader));
    } catch (e) {
      console.error("Failed to decode brand on landing page:", e);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 overflow-hidden font-sans selection:bg-brand-primary/20">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-12 py-3 sm:py-4 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} className="h-6 sm:h-8 w-auto" />
          ) : (
            <span className="text-xl sm:text-2xl">{brand.icon}</span>
          )}
          <span className="font-bold text-lg sm:text-xl tracking-tight text-gray-900 hidden sm:inline-block">
            {brand.name}
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/login"
            className="text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Vendor Login
          </Link>
          <Link
            href="/onboarding"
            className="px-3 sm:px-5 py-2 sm:py-2.5 text-gray-900 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
            style={{ backgroundColor: brand.secondaryColor }}
          >
            <span className="hidden sm:inline">Start Free Trial</span>
            <span className="sm:hidden">Start Free</span>
          </Link>
        </div>
      </nav>

      {/* SECTION 1: The Header (Character & Hook) */}
      <header className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-12 sm:pb-16 lg:pt-48 lg:pb-20 text-center">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-primary/5 blur-[100px] rounded-full -z-10" />

        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-slate-100 border border-slate-200 text-gray-700 text-[10px] sm:text-sm font-medium mb-6 sm:mb-8 whitespace-normal text-center mx-auto">
          <span className="w-2 h-2 rounded-full bg-brand-secondary animate-pulse flex-shrink-0" style={{ backgroundColor: brand.secondaryColor }} />
          Running natively on WhatsApp & Telegram
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.15] sm:leading-[1.1] tracking-tight mb-5 sm:mb-8">
          Stop losing customers to <br className="hidden md:block" />
          <span style={{ color: brand.primaryColor }}>long lines and slow service.</span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg lg:text-xl text-gray-600 leading-relaxed mb-10">
          Turn their favorite chat apps into your fastest cash register. Let your customers order and pay in under 60 seconds directly via WhatsApp and Telegram. Zero app downloads required.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <Link
            href="/onboarding"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 text-gray-900 font-bold rounded-2xl text-base sm:text-lg transition-all duration-200 hover:-translate-y-1"
            style={{ backgroundColor: brand.secondaryColor, boxShadow: `0 10px 25px -5px ${brand.secondaryColor}40` }}
          >
            Create Your Restaurant <ArrowRight size={18} className="sm:hidden" /><ArrowRight size={20} className="hidden sm:block" />
          </Link>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-0 sm:ml-4 text-center sm:text-left">
            14-day free trial. <br className="hidden sm:block" />No credit card required.
          </p>
        </div>
      </header>

      {/* SECTION 2: The Problem (Villain) */}
      <section className="bg-white py-12 sm:py-16 lg:py-24 px-4 sm:px-6 relative border-y border-gray-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 lg:mb-16 text-gray-900 tracking-tight">
            The lunch rush shouldn't feel like a penalty.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-red-500 mb-4 text-3xl">⏳</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Walk-Aways</h3>
              <p className="text-gray-600 leading-relaxed">Customers see a massive queue during peak hours and walk straight to your competitor next door.</p>
            </div>
            
            <div className="p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-red-500 mb-4 text-3xl">📱</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">30% Commissions</h3>
              <p className="text-gray-600 leading-relaxed">Third-party delivery apps eat your margins and withhold your customer data, preventing you from growing.</p>
            </div>

            <div className="p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-red-500 mb-4 text-3xl">🗣️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Order Errors</h3>
              <p className="text-gray-600 leading-relaxed">Taking orders over a noisy phone line leads to mistakes, refunded food, and frustrated customers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: The Guide */}
      <section className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 max-w-5xl mx-auto text-center relative z-10">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight">
            We believe ordering food should be frictionless.
        </h2>
        <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-12">
          We know how exhausting it is when the kitchen is backed up and the phone won't stop ringing. 
          That's why <strong className="text-gray-900 font-bold">{brand.name}</strong> was built to power fast, automated ordering entirely through the apps your customers already use every single day.
        </p>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
           <div className="flex items-center gap-4 bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
              <CheckCircle2 className="flex-shrink-0" size={24} style={{ color: brand.secondaryColor }} />
              <p className="font-semibold text-gray-800">100% margin on your orders</p>
           </div>
           <div className="flex items-center gap-4 bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
              <CheckCircle2 className="flex-shrink-0" size={24} style={{ color: brand.secondaryColor }} />
              <p className="font-semibold text-gray-800">Instantly update Sold Out items</p>
           </div>
           <div className="flex items-center gap-4 bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
              <CheckCircle2 className="flex-shrink-0" size={24} style={{ color: brand.secondaryColor }} />
              <p className="font-semibold text-gray-800">Integrated Stripe payments</p>
           </div>
           <div className="flex items-center gap-4 bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
              <CheckCircle2 className="flex-shrink-0" size={24} style={{ color: brand.secondaryColor }} />
              <p className="font-semibold text-gray-800">Live Kitchen Display System (KDS)</p>
           </div>
        </div>
      </section>

      {/* SECTION 4: The Plan */}
      <section className="bg-slate-100 py-12 sm:py-16 lg:py-24 px-4 sm:px-6 border-y border-gray-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-8 sm:mb-12 lg:mb-16 tracking-tight">
            Three steps to cut the queue
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-[2px] bg-gray-300 z-0" />
            
            <div className="relative z-10 text-center">
              <div className="w-20 h-20 mx-auto bg-white border border-gray-200 rounded-2xl flex items-center justify-center mb-6 shadow-md">
                <Store size={32} style={{ color: brand.primaryColor }} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">1. Build your menu</h3>
              <p className="text-gray-600">Add your items, variants, and prices using our visual dashboard. Zero coding required.</p>
            </div>

            <div className="relative z-10 text-center">
              <div className="w-20 h-20 mx-auto bg-white border border-gray-200 rounded-2xl flex items-center justify-center mb-6 shadow-md">
                <Smartphone size={32} style={{ color: brand.primaryColor }} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">2. Share your link</h3>
              <p className="text-gray-600">Put your Telegram or WhatsApp QR code on tables, counters, and social media.</p>
            </div>

            <div className="relative z-10 text-center">
              <div className="w-20 h-20 mx-auto bg-white border border-gray-200 rounded-2xl flex items-center justify-center mb-6 shadow-md">
                <Zap size={32} style={{ color: brand.primaryColor }} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">3. Watch orders flow</h3>
              <p className="text-gray-600">Pre-paid orders hit your Kitchen Display instantly. Fulfill them and click "Ready".</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: The Stakes / CTA */}
      <section className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto bg-gray-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-12 lg:p-16 text-center shadow-2xl relative overflow-hidden">
          {/* Accent glow on dark card */}
          <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-brand-secondary/20 blur-[60px] sm:blur-[80px] rounded-full point-events-none" style={{ backgroundColor: `${brand.secondaryColor}40` }} />
          <div className="absolute bottom-0 left-0 w-48 sm:w-64 h-48 sm:h-64 bg-brand-primary/20 blur-[60px] sm:blur-[80px] rounded-full pointer-events-none" style={{ backgroundColor: `${brand.primaryColor}40` }} />
          
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-4 sm:mb-6 tracking-tight relative z-10 leading-tight">
            Ready to reclaim your peak hours?
          </h2>
          <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-2xl mx-auto relative z-10 font-medium leading-relaxed">
            Stop losing revenue to walk-aways. Start processing 3x more orders per hour with a system your customers already know how to use.
          </p>
          
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-4 sm:px-10 sm:py-5 text-gray-900 font-bold rounded-2xl text-base sm:text-xl transition-all duration-200 hover:scale-105 relative z-10 shadow-xl"
            style={{ backgroundColor: brand.secondaryColor }}
          >
            Start your free 14-day trial
          </Link>
          <p className="text-sm text-gray-400 mt-6 relative z-10">Set up in 5 minutes. Cancel anytime.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 px-6 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-4">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt={brand.name} className="h-6 w-auto" />
          ) : (
            <span className="text-xl">{brand.icon}</span>
          )}
          <span className="font-bold text-lg text-gray-900">
            {brand.name}
          </span>
        </div>
        <p className="text-sm text-gray-500 max-w-md">
          Providing modern restaurants with blazing fast ordering infrastructure via the apps everyone already uses.
        </p>
        <p className="text-xs text-gray-400 mt-8 font-medium">
          © {new Date().getFullYear()} {brand.name}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
