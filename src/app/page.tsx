import Link from "next/link";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "MenuHorse — WhatsApp Ordering for Cafeterias",
  description:
    "Let your customers browse menus, place orders, and pay — all via WhatsApp. No app downloads. Zero friction. Built for cafeterias.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full bg-teal-500/8 blur-[100px] animate-pulse delay-1000" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-violet-500/5 blur-[80px] animate-pulse delay-500" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐴</span>
          <span className="font-bold text-xl bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            MenuHorse
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/onboarding"
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20"
          >
            Join Beta (2 spots left)
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 lg:pt-28 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Beta testers report 15 min → 4 min average wait times
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight tracking-tight">
          Cut lunch rush chaos by 70%
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent text-3xl sm:text-4xl lg:text-5xl">
            Customers order via WhatsApp, no app downloads
          </span>
        </h1>

        <p className="max-w-2xl mx-auto mt-6 text-lg text-gray-400 leading-relaxed">
          The fastest way to take orders. Customers browse, customize, and pay entirely inside WhatsApp. No new apps. Zero friction. Just orders flowing directly to your kitchen.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link
            href="/onboarding"
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl text-lg transition-all duration-200 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
          >
            Join beta — first 10 free (2 spots left) →
          </Link>
          <button className="px-8 py-4 border border-white/10 hover:border-white/20 rounded-2xl text-lg font-medium text-gray-300 hover:text-white transition-all duration-200">
            Watch Demo
          </button>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm font-medium text-gray-400">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <span>⚡</span>
            <span>Official WhatsApp Business Solution Provider</span>
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
              title: "Customer texts you",
              description:
                'Customer sends "Hi" to your WhatsApp number and instantly gets your full menu with images and prices.',
            },
            {
              step: "02",
              icon: "🛒",
              title: "They order & pay",
              description:
                "Customers select items, customize options, choose pickup time, and pay — all without leaving WhatsApp.",
            },
            {
              step: "03",
              icon: "🔔",
              title: "You fulfill & notify",
              description:
                'See orders in your dashboard, update status with one click, and customers get "Ready for pickup!" automatically.',
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
            run orders
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: "📋", title: "Visual Menu Builder", desc: "Drag-drop builder with images, variants, and modifiers" },
            { icon: "💳", title: "Instant Payments", desc: "Stripe-powered secure payments via WhatsApp" },
            { icon: "📊", title: "Live Analytics", desc: "Revenue, peak hours, top items — all real-time" },
            { icon: "🔔", title: "Auto Notifications", desc: "Customers know exactly when their order is ready" },
            { icon: "⏰", title: "Pre-Order Scheduling", desc: "Let customers plan ahead with pickup time slots" },
            { icon: "🔄", title: "Quick Reorder", desc: "One tap to repeat their favorite order" },
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
              price: "$29",
              desc: "Perfect for small cafeterias",
              features: ["100 orders/month", "1 WhatsApp number", "Basic analytics", "Email support"],
              popular: false,
            },
            {
              name: "Growth",
              price: "$79",
              desc: "For growing businesses",
              features: ["Unlimited orders", "Priority support", "Advanced analytics", "CSV exports", "Custom prep times"],
              popular: true,
            },
            {
              name: "Enterprise",
              price: "$199",
              desc: "Multi-location power",
              features: ["Multi-location", "API access", "Custom branding", "Dedicated support", "SLA guarantee"],
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
                <span className="text-gray-500 text-sm">/mo</span>
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
              <button
                className={cn(
                  "w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200",
                  plan.popular
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                )}
              >
                Start Free Trial
              </button>
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
          Join 8 cafeterias already transforming their ordering. Set up in
          5 minutes.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-10 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl text-lg transition-all duration-200 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
        >
          Join beta — first 10 free (2 spots left) →
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-lg">🐴</span>
          <span className="font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            MenuHorse
          </span>
        </div>
        <p className="text-xs text-gray-600">
          © 2026 MenuHorse. WhatsApp-first ordering for cafeterias.
        </p>
      </footer>
    </div>
  );
}
