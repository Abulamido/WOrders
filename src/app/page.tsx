import Link from "next/link";
import { headers } from "next/headers";
import { cn } from "@/lib/utils";
import { DEFAULT_BRAND } from "@/lib/brand";

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
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full bg-teal-500/8 blur-[100px] animate-pulse delay-1000" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-blue-500/5 blur-[80px] animate-pulse delay-500" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{brand.icon}</span>
          <span className="font-bold text-xl bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
            {brand.name}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Restaurant Login
          </Link>
          <Link
            href="/onboarding"
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 lg:pt-28 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Now live on Telegram — order in under 60 seconds
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight tracking-tight">
          Cut lunch rush chaos by 70%
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-blue-400 bg-clip-text text-transparent text-3xl sm:text-4xl lg:text-5xl">
            Customers order via Telegram — no app downloads
          </span>
        </h1>

        <p className="max-w-2xl mx-auto mt-6 text-lg text-gray-400 leading-relaxed">
          The fastest way to take orders. Customers open your Telegram bot, browse your menu, and pay — all in under a minute.
          No new apps. Zero friction. Orders flow directly to your kitchen dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link
            href="/onboarding"
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl text-lg transition-all duration-200 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
          >
            Start your free restaurant →
          </Link>
          <Link
            href="/onboarding"
            className="px-8 py-4 border border-teal-400/20 hover:border-teal-400/40 rounded-2xl text-lg font-medium text-teal-300 hover:text-teal-200 transition-all duration-200 hover:-translate-y-0.5"
          >
            📱 Get Your Telegram Link
          </Link>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm font-medium text-gray-400">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/15">
            <span>🔹</span>
            <span>Powered by Telegram</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <span>🔒</span>
            <span>PCI Compliant via Stripe</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">
          How it works
        </h2>
        <p className="text-center text-gray-400 mb-16 max-w-lg mx-auto">
          Three steps to transform your cafeteria ordering
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              icon: "📱",
              title: "Customer scans your QR",
              description:
                'Customer scans a QR code or taps your Telegram link. One tap to start the bot and they instantly see your full menu.',
            },
            {
              step: "02",
              icon: "🛒",
              title: "They order & pay",
              description:
                "Customers tap to select items, customize sizes, choose pickup time, and pay via Stripe — all inside Telegram.",
            },
            {
              step: "03",
              icon: "🔔",
              title: "You manage & fulfill",
              description:
                "See orders in your dashboard OR right in your own Telegram. Update status and customers get notified automatically.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-[#141420]/80 border border-white/5 rounded-2xl p-8 hover:border-emerald-500/20 transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-bold text-emerald-500/40 font-mono">
                  {item.step}
                </span>
                <span className="text-3xl">{item.icon}</span>
              </div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-emerald-400 transition-colors">
                {item.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-16">
          Everything you need to{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            run your restaurant
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: "📱", title: "Telegram Ordering", desc: "Customers browse, customize, and order entirely inside Telegram" },
            { icon: "📋", title: "Visual Menu Builder", desc: "Build your menu with items, variants, and modifiers from the dashboard" },
            { icon: "💳", title: "Instant Payments", desc: "Stripe-powered secure checkout — pay directly from Telegram" },
            { icon: "📊", title: "Live Analytics", desc: "Revenue, peak hours, top items — all real-time on your dashboard" },
            { icon: "🔔", title: "Auto Notifications", desc: "Customers get order updates automatically via Telegram" },
            { icon: "🏪", title: "Multi-Restaurant", desc: "Each restaurant gets its own dashboard, menu, and Telegram link" },
            { icon: "⏰", title: "Pre-Order Scheduling", desc: "Let customers plan ahead with pickup time slots" },
            { icon: "🔄", title: "Quick Reorder", desc: "One tap to repeat their favorite order via Telegram" },
            { icon: "👨‍🍳", title: "Kitchen Dashboard", desc: "Kanban-style order board for your kitchen team to manage orders" },
          ].map((feat) => (
            <div
              key={feat.title}
              className="flex items-start gap-4 p-5 rounded-xl hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-2xl flex-shrink-0 mt-0.5">{feat.icon}</span>
              <div>
                <h3 className="font-semibold mb-1">{feat.title}</h3>
                <p className="text-sm text-gray-400">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">
          Simple pricing
        </h2>
        <p className="text-center text-gray-400 mb-16">
          Start free. Scale as you grow.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: "Starter",
              price: "Free",
              period: "during beta",
              desc: "Perfect for getting started",
              features: ["Telegram ordering", "Up to 100 orders/month", "Menu builder", "Basic analytics", "Email support"],
              popular: false,
            },
            {
              name: "Growth",
              price: "$49",
              period: "/mo",
              desc: "For busy restaurants",
              features: ["Unlimited orders", "Telegram ordering channel", "Advanced analytics & exports", "Priority support", "Custom prep times"],
              popular: true,
            },
            {
              name: "Enterprise",
              price: "$149",
              period: "/mo",
              desc: "Multi-location power",
              features: ["Multi-location management", "API access", "Custom branding on Telegram", "Dedicated support", "SLA guarantee"],
              popular: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative rounded-2xl p-8 border transition-all duration-300",
                plan.popular
                  ? "bg-gradient-to-b from-emerald-500/10 to-transparent border-emerald-500/30 shadow-2xl shadow-emerald-500/10"
                  : "bg-[#141420]/80 border-white/5 hover:border-white/10"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{plan.desc}</p>
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-gray-500 text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-gray-300"
                  >
                    <span className="text-emerald-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/onboarding"
                className={cn(
                  "block w-full py-3 rounded-xl font-semibold text-sm text-center transition-all duration-200",
                  plan.popular
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                )}
              >
                {plan.price === "Free" ? "Start Free" : "Start Free Trial"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">
          Ready to{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            eliminate the queue?
          </span>
        </h2>
        <p className="text-gray-400 mb-8 max-w-lg mx-auto">
          Join restaurants already transforming their ordering with Telegram. Set up in 5 minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/onboarding"
            className="inline-block px-10 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl text-lg transition-all duration-200 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
          >
            Create your restaurant →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-lg">{brand.icon}</span>
          <span className="font-bold bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${brand.primaryColor}, ${brand.secondaryColor})` }}>
            {brand.name}
          </span>
        </div>
        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} {brand.name}. Telegram ordering for restaurants.
        </p>
      </footer>
    </div>
  );
}
