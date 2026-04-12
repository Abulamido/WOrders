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
            <img src={brand.logoUrl} alt={brand.name} className="h-8 sm:h-10 w-auto" />
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

        {/* Demo Bots Section */}
        <div className="mt-12 sm:mt-16 pt-8 border-t border-gray-200/60 flex flex-col items-center">
          <p className="text-sm font-semibold text-gray-500 mb-5 uppercase tracking-wider">Experience the ordering flow live</p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0">
            <Link 
              href="https://t.me/Cafteriaflow_bot" 
              target="_blank"
              className="flex justify-center items-center gap-2 w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-[#229ED9]/10 text-[#229ED9] hover:bg-[#229ED9]/20 font-bold rounded-xl transition-colors border border-[#229ED9]/20"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              Try Telegram Bot
            </Link>
            <Link 
              href="https://wa.me/2347077241096?text=Hi" 
              target="_blank"
              className="flex justify-center items-center gap-2 w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 font-bold rounded-xl transition-colors border border-[#25D366]/20"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
              Try WhatsApp Bot
            </Link>
          </div>
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
            <img src={brand.logoUrl} alt={brand.name} className="h-8 sm:h-10 w-auto" />
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
