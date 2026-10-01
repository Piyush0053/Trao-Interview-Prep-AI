"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, BrainCircuit, Target, Calendar, Shield, Zap } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Target,
    title: "Role-Specific Questions",
    desc: "We extract exact requirements from the JD and map them to targeted questions. No generic advice — every card is tied to what the role actually demands.",
    gradient: "card-gradient-technical",
    badge: "Automated",
  },
  {
    icon: BrainCircuit,
    title: "Deep Company Research",
    desc: "Our AI crawls the company's hiring pages and career portals to understand their culture, interview process, and engineering values.",
    gradient: "card-gradient-behavioural",
    badge: "AI-Powered",
  },
  {
    icon: Calendar,
    title: "Smart Study Schedule",
    desc: "Get a deterministic day-by-day study plan that distributes high-priority material earlier — exactly across however many days you have.",
    gradient: "card-gradient-system-design",
    badge: "Deterministic",
  },
];

const stats = [
  { value: "8-step", label: "AI Pipeline" },
  { value: "Multi-pass", label: "Coverage Check" },
  { value: "Pinned Edits", label: "Stay Safe on Regen" },
  { value: "Confidence", label: "Based Flashcards" },
];

export default function Home() {
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="relative overflow-hidden">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative max-w-screen-xl mx-auto px-6 pt-20 pb-16 flex flex-col items-center text-center animate-slide-up">

        {/* Eyebrow pill */}
        <div className="badge-cyan mb-6 py-1 px-4 text-xs font-bold uppercase tracking-widest gap-1.5">
          <Sparkles className="w-3 h-3" />
          AI-Powered Interview Preparation
        </div>

        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-textMain mb-6 max-w-4xl leading-[1.1]">
          Turn any job description into a{" "}
          <span className="text-transparent bg-clip-text bg-gradient-primary">
            personalised prep kit
          </span>
        </h1>

        <p className="text-base sm:text-lg text-textSecondary mb-10 max-w-2xl leading-relaxed">
          Paste a job description and company URL. Our AI crawls the company site, extracts requirements, and builds a structured kit — questions, flashcards, and a day-by-day schedule — in minutes.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          {user ? (
            <Link href="/dashboard" className="btn-primary text-base px-7 py-3 gap-2">
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link href="/register" className="btn-primary text-base px-7 py-3 gap-2">
                Start Preparing Free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="btn-secondary text-base px-7 py-3">
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-2xl mb-6">
          {stats.map(s => (
            <div key={s.label} className="stat-card items-center text-center py-3">
              <span className="text-sm font-bold text-primary">{s.value}</span>
              <span className="text-xs text-textMuted">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="max-w-screen-xl mx-auto px-6 pb-10">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-textMain mb-3">
            From job description to interview-ready in minutes
          </h2>
          <p className="text-textSecondary text-sm max-w-xl mx-auto">
            A genuine multi-step research and generation pipeline — not a single prompt.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card-gradient animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className={`card-gradient-header ${f.gradient} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-white/80" />
                    <span>{f.title}</span>
                  </div>
                  <span className="badge-gray text-[10px] py-0.5">{f.badge}</span>
                </div>
                <div className="p-5">
                  <p className="text-sm text-textSecondary leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Feature highlight ────────────────────────────────── */}
      <section className="max-w-screen-xl mx-auto px-6 pb-20">
        <div className="panel p-8 md:p-12 flex flex-col md:flex-row gap-10 items-center">
          <div className="flex-1">
            <div className="badge-cyan mb-4 text-xs">Assessment-Grade Quality</div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-textMain mb-4 leading-tight">
              Built to the spec that evaluators actually check
            </h2>
            <ul className="space-y-3">
              {[
                { icon: Zap,    text: "Stable requirement IDs linking every question and flashcard" },
                { icon: Shield, text: "Multi-pass coverage loop — no must-have requirement goes unasked" },
                { icon: Target, text: "Deterministic schedule allocation — arithmetic, not AI guesswork" },
                { icon: BrainCircuit, text: "Pinned edits survive section regenerations" },
              ].map(({ icon: I, text }) => (
                <li key={text} className="flex items-start gap-3 text-sm text-textSecondary">
                  <div className="w-5 h-5 rounded-md bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <I className="w-3 h-3 text-primary" />
                  </div>
                  {text}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              {user ? (
                <Link href="/kits/new" className="btn-primary">
                  Create a Kit <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link href="/register" className="btn-primary">
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Decorative preview block */}
          <div className="flex-shrink-0 w-full md:w-80">
            <div className="bg-surfaceHighlight border border-borderSubtle rounded-xl overflow-hidden shadow-panel">
              <div className="card-gradient-header card-gradient-technical flex items-center gap-2 text-xs">
                <BrainCircuit className="w-3.5 h-3.5" />
                Technical Question Bank
              </div>
              {[
                { cat: "technical",   diff: 3, q: "How does React's reconciliation algorithm handle keys?" },
                { cat: "system-design", diff: 2, q: "Design a rate-limiter for a public API." },
                { cat: "behavioural", diff: 1, q: "Describe a time you improved team velocity." },
              ].map((item, i) => (
                <div key={i} className="px-4 py-3 border-b border-borderSubtle last:border-0 flex items-start gap-3">
                  <div className={`mt-0.5 badge text-[10px] shrink-0
                    ${item.cat === "technical"     ? "badge-blue"   :
                      item.cat === "system-design" ? "badge-green"  : "badge-purple"}`}>
                    {item.cat.replace("-", " ")}
                  </div>
                  <p className="text-xs text-textSecondary leading-relaxed">{item.q}</p>
                  <span className={`ml-auto badge text-[10px] shrink-0
                    ${item.diff === 3 ? "badge-red" : item.diff === 2 ? "badge-amber" : "badge-green"}`}>
                    {item.diff}/3
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
