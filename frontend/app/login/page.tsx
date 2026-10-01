"use client";
import { useState } from "react";
import { ArrowRight, Lock, Mail, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-6 relative z-10">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-primary mx-auto flex items-center justify-center shadow-glow-cyan mb-5">
            <BrainCircuit className="w-6 h-6 text-[#0d1117]" />
          </div>
          <h1 className="font-display text-2xl font-bold text-textMain mb-1">Welcome back</h1>
          <p className="text-sm text-textSecondary">Sign in to continue your interview prep</p>
        </div>

        {/* Card */}
        <div className="panel p-7">
          <form onSubmit={handleSubmit} className="space-y-5" id="login-form">

            {error && (
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-red-400 text-sm flex items-start gap-2">
                <span className="mt-0.5 shrink-0">⚠</span>
                {error}
              </div>
            )}

            <div>
              <label className="label" htmlFor="login-email">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="login-password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-textMuted" />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <div className="w-3.5 h-3.5 border-2 border-[#0d1117]/30 border-t-[#0d1117] rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-textMuted">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
