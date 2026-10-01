"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight, Plus, Calendar, FileText, Trash2, BrainCircuit,
  BookOpen, CheckCircle2, Clock, TrendingUp, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type KitSummary = {
  _id: string;
  status: string;
  source?: { role?: string; company?: string };
  createdAt: string;
  schedule?: { days_available?: number };
};

function daysLeft(kit: KitSummary) {
  if (!kit.schedule?.days_available) return null;
  return Math.max(
    0,
    kit.schedule.days_available -
      Math.floor((Date.now() - new Date(kit.createdAt).getTime()) / 86400000)
  );
}

function statusMeta(status: string) {
  switch (status) {
    case "ready":      return { label: "Ready",      cls: "badge-cyan"  };
    case "generating": return { label: "Generating", cls: "badge-amber" };
    case "failed":     return { label: "Failed",     cls: "badge-red"   };
    default:           return { label: status,       cls: "badge-gray"  };
  }
}

function KitCard({ kit, onDelete }: { kit: KitSummary; onDelete: (e: React.MouseEvent, id: string) => void }) {
  const left  = daysLeft(kit);
  const meta  = statusMeta(kit.status);
  const urgent = left !== null && left <= 2;

  return (
    <Link href={`/kits/${kit._id}`} className="block group">
      <div className="card-gradient h-full flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow-cyan">
        {/* Gradient header */}
        <div className={`card-gradient-header ${kit.status === "ready" ? "card-gradient-day" : kit.status === "failed" ? "card-gradient-hard" : "card-gradient-medium"} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-3.5 h-3.5 text-white/80" />
            <span className="truncate max-w-[160px]">{kit.source?.company || "Company"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={meta.cls}>{meta.label}</span>
            <button
              onClick={(e) => onDelete(e, kit._id)}
              className="w-6 h-6 rounded-md bg-white/10 hover:bg-red-500/40 flex items-center justify-center text-white/70 hover:text-white transition-colors"
              title="Delete kit"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-display font-semibold text-textMain text-base mb-1 truncate group-hover:text-primary transition-colors">
            {kit.source?.role || "New Kit"}
          </h3>

          <div className="flex items-center gap-3 mt-auto pt-3 border-t border-borderSubtle text-xs text-textMuted">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(kit.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
            {kit.schedule?.days_available && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {kit.schedule.days_available}d plan
              </span>
            )}
            {left !== null && (
              <span className={`ml-auto font-bold flex items-center gap-1 ${urgent ? "text-red-400" : "text-primary"}`}>
                {left}d left
              </span>
            )}
            {kit.status === "ready" && (
              <ChevronRight className="w-3.5 h-3.5 text-textMuted group-hover:text-primary transition-colors ml-auto" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [kits, setKits] = useState<KitSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/kits")
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) router.push("/login");
          throw new Error("Failed to fetch");
        }
        return res.json();
      })
      .then(data => { setKits(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [router]);

  const handleDelete = async (e: React.MouseEvent, kitId: string) => {
    e.preventDefault();
    if (!confirm("Delete this kit? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/kits/${kitId}`, { method: "DELETE" });
      if (res.ok) setKits(kits.filter(k => k._id !== kitId));
      else throw new Error("Failed to delete");
    } catch { alert("Failed to delete kit. Please try again."); }
  };

  /* ── Derived stats ── */
  const readyKits  = kits.filter(k => k.status === "ready");
  const totalKits  = kits.length;
  const nearestLeft = readyKits
    .map(daysLeft)
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b)[0] ?? null;

  const statsRow = [
    { icon: FileText,    label: "Total Kits",      value: totalKits,                    cls: "text-primary" },
    { icon: CheckCircle2,label: "Ready",            value: readyKits.length,             cls: "text-success" },
    { icon: TrendingUp,  label: "Active",           value: kits.filter(k => k.status === "generating").length, cls: "text-warning" },
    { icon: Clock,       label: "Nearest Deadline", value: nearestLeft !== null ? `${nearestLeft}d` : "—", cls: nearestLeft !== null && nearestLeft <= 2 ? "text-red-400" : "text-primary" },
  ];

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-20 pt-8 animate-fade-in relative z-10">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-textMain">My Kits</h1>
          <p className="text-sm text-textSecondary mt-1">Manage your interview preparation kits</p>
        </div>
        <Link href="/kits/new" className="btn-primary gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Generate New Kit
        </Link>
      </div>

      {/* ── Analytics row ── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {statsRow.map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="stat-card">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-textMuted">{s.label}</span>
                  <Icon className={`w-3.5 h-3.5 ${s.cls}`} />
                </div>
                <span className={`text-2xl font-display font-bold ${s.cls}`}>{s.value}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Kit grid ── */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-44 rounded-xl" />
          ))}
        </div>
      ) : kits.length === 0 ? (
        /* Empty state */
        <div className="panel text-center py-20 px-6 flex flex-col items-center">
          <div className="w-14 h-14 rounded-xl bg-surfaceHighlight flex items-center justify-center mb-5 border border-borderStrong">
            <BookOpen className="w-7 h-7 text-textMuted" />
          </div>
          <h2 className="font-display text-xl font-bold text-textMain mb-2">No kits yet</h2>
          <p className="text-sm text-textSecondary mb-8 max-w-sm">
            Generate your first interview prep kit by pasting a job description and company URL.
          </p>
          <Link href="/kits/new" className="btn-primary gap-2">
            Create First Kit <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {kits.map(kit => (
              <KitCard key={kit._id} kit={kit} onDelete={handleDelete} />
            ))}

            {/* Quick-create card */}
            <Link
              href="/kits/new"
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-borderStrong hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 min-h-[140px] p-6 text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-surfaceHighlight group-hover:bg-primary/15 flex items-center justify-center transition-colors">
                <Plus className="w-5 h-5 text-textMuted group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-sm font-medium text-textSecondary group-hover:text-primary transition-colors">New Kit</p>
                <p className="text-xs text-textMuted mt-0.5">Paste a job description</p>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
