"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, PlusSquare, BookOpen, Menu, X, BrainCircuit, ChevronDown } from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/kits/new",  label: "New Kit",   icon: PlusSquare },
  { href: "/dashboard", label: "Practice",  icon: BookOpen },
];

export default function Navbar() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => { if (res.ok) return res.json(); throw new Error(); })
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMenuOpen(false);
    router.push("/");
  };

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname.startsWith("/kits")
      : pathname === href || pathname.startsWith(href);

  return (
    <>
      {/* Top Navbar */}
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-200 border-b
          ${scrolled
            ? "bg-background/95 backdrop-blur-xl border-borderSubtle shadow-panel"
            : "bg-background/80 backdrop-blur-md border-borderSubtle/50"
          }`}
      >
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow-cyan shrink-0">
              <BrainCircuit className="w-4 h-4 text-[#0d1117]" />
            </div>
            <span className="font-display font-bold text-base text-textMain group-hover:text-primary transition-colors tracking-tight">
              Trao <span className="text-primary">AI</span>
            </span>
          </Link>

          {/* Center nav — desktop */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const active = isActive(href) && !(label === "Practice" && pathname === "/dashboard");
                return (
                  <Link
                    key={label}
                    href={href}
                    className={active ? "nav-pill-active" : "nav-pill"}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right — auth actions */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <>
                {/* Avatar + email */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surfaceHighlight border border-borderSubtle text-sm text-textSecondary">
                  <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center text-[#0d1117] text-xs font-bold uppercase">
                    {user.email[0]}
                  </div>
                  <span className="max-w-[120px] truncate">{user.email}</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-secondary hidden sm:inline-flex py-1.5 text-xs"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login"    className="btn-ghost text-sm py-1.5 hidden sm:inline-flex">Sign In</Link>
                <Link href="/register" className="btn-primary text-sm py-1.5">Get Started</Link>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              className="btn-ghost p-2 md:hidden"
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-borderSubtle bg-background/98 backdrop-blur-xl animate-slide-down">
            <div className="max-w-screen-xl mx-auto px-4 py-3 space-y-1">
              {user ? (
                <>
                  {navLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={label}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                        ${isActive(href) ? "bg-primary/10 text-primary" : "text-textSecondary hover:bg-surfaceHighlight hover:text-textMain"}`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  ))}
                  <div className="pt-2 border-t border-borderSubtle">
                    <div className="px-3 py-2 text-xs text-textMuted truncate">{user.email}</div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-textSecondary hover:bg-surfaceHighlight hover:text-textMain transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login"    onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-textSecondary hover:bg-surfaceHighlight hover:text-textMain transition-colors">Sign In</Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Get Started</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
