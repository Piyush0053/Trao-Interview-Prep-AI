"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, BrainCircuit, Target } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);
  return (
    <div className="max-w-7xl mx-auto px-6 pb-20 overflow-hidden">
      {/* Hero Section */}
      <section className="py-24 flex flex-col items-center text-center animate-slide-up relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
          <Sparkles className="w-4 h-4" />
          <span>Intelligent Interview Prep</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 max-w-4xl leading-[1.1]">
          Master Your Next <br />
          <span className="text-transparent bg-clip-text bg-gradient-primary">Technical Interview</span>
        </h1>
        
        <p className="text-lg md:text-xl text-textMuted mb-12 max-w-2xl leading-relaxed">
          Paste a job description and company URL. Our AI generates a personalized, multi-day preparation kit tailored specifically to the role and company culture.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {user ? (
            <Link href="/dashboard" className="btn-primary flex items-center justify-center gap-2 text-base px-8 py-3.5">
              Go to Dashboard <ArrowRight className="w-5 h-5" />
            </Link>
          ) : (
            <>
              <Link href="/register" className="btn-primary flex items-center justify-center gap-2 text-base px-8 py-3.5">
                Start Preparing <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/login" className="btn-secondary flex items-center justify-center text-base px-8 py-3.5">
                View Existing Kits
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid md:grid-cols-3 gap-6 mt-16 relative z-10">
        <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-inner shadow-primary/20">
            <Target className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-semibold mb-3">Role Specific</h3>
          <p className="text-textMuted leading-relaxed">
            We extract exact requirements from the JD and map them to targeted questions and flashcards. No generic advice.
          </p>
        </div>
        
        <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary mb-6 shadow-inner shadow-secondary/20">
            <BrainCircuit className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-semibold mb-3">Deep Research</h3>
          <p className="text-textMuted leading-relaxed">
            Our AI crawls the company&apos;s hiring pages and career portals to understand their culture and engineering values.
          </p>
        </div>
        
        <div className="glass-card p-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent mb-6 shadow-inner shadow-accent/20">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-2xl font-semibold mb-3">Smart Scheduling</h3>
          <p className="text-textMuted leading-relaxed">
            Get a deterministic day-by-day study schedule optimizing your preparation time based on priority and difficulty.
          </p>
        </div>
      </section>
    </div>
  );
}
