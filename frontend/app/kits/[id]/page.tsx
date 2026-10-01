"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import GenerationProgress from "./components/GenerationProgress";
import EditableField from "./components/EditableField";
import QuestionBoard from "./components/QuestionBoard";
import FlashcardBoard from "./components/FlashcardBoard";
import ReadinessMatrix from "./components/ReadinessMatrix";
import {
  FileText, Calendar, BrainCircuit, Sparkles, BookOpen, ArrowLeft,
  BarChart2, RefreshCcw, ExternalLink, Clock, Target, ChevronRight,
  AlertCircle, CheckCircle2
} from "lucide-react";
import Link from "next/link";

const TABS = [
  { id: "brief",     label: "Company Brief",      icon: FileText    },
  { id: "role",      label: "Role & Requirements", icon: Target      },
  { id: "questions", label: "Question Bank",       icon: BrainCircuit },
  { id: "schedule",  label: "Study Schedule",      icon: Calendar    },
  { id: "flashcards",label: "Practice",            icon: BookOpen    },
  { id: "readiness", label: "Readiness Matrix",    icon: BarChart2   },
];

function daysLeft(kit: { createdAt: string; schedule?: { days_available?: number } }) {
  if (!kit.schedule?.days_available) return null;
  return Math.max(0, kit.schedule.days_available - Math.floor((Date.now() - new Date(kit.createdAt).getTime()) / 86400000));
}

export default function KitDetail() {
  const params = useParams();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [kit, setKit] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("brief");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const handleRegenerate = async (section: string) => {
    if (!confirm(`Regenerate the ${section} section? Pinned/edited items will be preserved.`)) return;
    setRegenerating(section);
    try {
      const res = await fetch(`/api/kits/${kit._id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKit(data);
    } catch (err) {
      alert(`Failed to regenerate: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRegenerating(null);
    }
  };

  const handleUpdateBrief = async (field: "summary" | "what_they_do", value: string) => {
    const updatedBrief = { ...(kit.company_brief || {}), [field]: value };
    const res = await fetch(`/api/kits/${kit._id}/brief`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: updatedBrief, updatedAt: kit.updatedAt })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update company brief");
    }
    setKit(await res.json());
  };

  useEffect(() => {
    fetch(`/api/kits/${params.id}`)
      .then(res => {
        if (res.status === 401) router.push("/login");
        if (res.status === 404 || res.status === 403) router.push("/dashboard");
        return res.json();
      })
      .then(setKit)
      .catch(console.error);
  }, [params.id, router]);

  if (!kit) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-textMuted">Loading your kit…</p>
        </div>
      </div>
    );
  }

  if (kit.status !== "ready" && kit.status !== "failed") {
    return <GenerationProgress kitId={params.id as string} />;
  }

  if (kit.status === "failed") {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 panel text-center">
        <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="font-display text-xl font-bold text-red-400 mb-3">Generation Failed</h2>
        <p className="text-sm text-textSecondary mb-6">We encountered an error building your interview kit.</p>
        <button onClick={() => router.push("/dashboard")} className="btn-secondary">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const left    = daysLeft(kit);
  const urgent  = left !== null && left <= 2;
  const mustCount = kit.role?.requirements?.filter((r: { priority: string }) => r.priority === "must").length ?? 0;
  const covered   = kit.coverage?.uncovered_requirement_ids?.length === 0;

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-20 pt-6 animate-fade-in relative z-10">

      {/* ── Kit header ── */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Link href="/dashboard" className="btn-ghost gap-1 text-xs py-1 px-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Kits
          </Link>
          <span className="text-borderStrong">›</span>
          <span className="badge-cyan text-xs">Ready to Study</span>
          {left !== null && (
            <span className={`badge text-xs ${urgent ? "badge-red" : "badge-gray"}`}>
              <Clock className="w-3 h-3" /> {left} days left
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-textMain leading-tight">
              {kit.source?.role || "Interview Kit"}
            </h1>
            <p className="text-sm text-textSecondary mt-1 flex items-center gap-2">
              {kit.source?.company || "Company"}
              {kit.source?.company_url && (
                <a href={kit.source.company_url} target="_blank" rel="noreferrer"
                   className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                  Visit site <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </p>
          </div>
          {/* Quick actions */}
          <Link href={`/kits/${kit._id}/practice`} className="btn-primary gap-2 text-sm shrink-0">
            <Sparkles className="w-4 h-4" /> Start Practice
          </Link>
        </div>
      </div>

      {/* ── Three-column layout ── */}
      <div className="flex gap-6 items-start">

        {/* ── Left sidebar: tab navigation ── */}
        <nav className="hidden lg:flex flex-col w-52 shrink-0 panel p-3 gap-0.5 sticky top-20" aria-label="Kit sections">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedDay(null); }}
                className={active ? "sidebar-item-active" : "sidebar-item"}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Mobile tab bar ── */}
        <div className="lg:hidden flex overflow-x-auto no-scrollbar gap-1 mb-4 w-full">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedDay(null); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors
                  ${active ? "bg-primary/15 text-primary border border-primary/25" : "bg-surfaceHighlight text-textSecondary hover:text-textMain"}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Center: main content ── */}
        <div className="flex-1 min-w-0">

          {/* ─ Company Brief ─ */}
          {activeTab === "brief" && (
            <div className="panel overflow-hidden animate-fade-in">
              <div className="card-gradient-header card-gradient-technical flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-white/80" />
                  Company Brief
                </div>
                <button
                  onClick={() => handleRegenerate("brief")}
                  disabled={regenerating === "brief"}
                  className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${regenerating === "brief" ? "animate-spin" : ""}`} />
                  {regenerating === "brief" ? "Regenerating…" : "Regenerate"}
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="font-display text-base font-semibold text-textMain mb-3">Company Overview</h2>
                  <EditableField
                    initialValue={kit.company_brief?.summary || ""}
                    field="company_brief.summary"
                    kitId={kit._id}
                    isTextArea
                    onSave={(val) => handleUpdateBrief("summary", val)}
                  />
                </div>
                <div className="pt-4 border-t border-borderSubtle">
                  <h3 className="text-sm font-semibold text-textMain mb-3">What They Do</h3>
                  <EditableField
                    initialValue={kit.company_brief?.what_they_do || ""}
                    field="company_brief.what_they_do"
                    kitId={kit._id}
                    isTextArea
                    onSave={(val) => handleUpdateBrief("what_they_do", val)}
                  />
                </div>
                {kit.company_brief?.sources?.length > 0 && (
                  <div className="pt-4 border-t border-borderSubtle">
                    <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2">Sources</h4>
                    <div className="flex flex-wrap gap-2">
                      {kit.company_brief.sources.map((src: string) => (
                        <a key={src} href={src} target="_blank" rel="noreferrer"
                           className="text-xs text-primary hover:underline flex items-center gap-1 bg-primary/5 px-2 py-1 rounded-md border border-primary/15">
                          <ExternalLink className="w-3 h-3" />
                          {new URL(src).hostname}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ Role & Requirements ─ */}
          {activeTab === "role" && (
            <div className="panel overflow-hidden animate-fade-in">
              <div className="card-gradient-header card-gradient-behavioural flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-white/80" />
                  Role Profile
                </div>
                <button onClick={() => handleRegenerate("role")} disabled={regenerating === "role"}
                  className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors">
                  <RefreshCcw className={`w-3.5 h-3.5 ${regenerating === "role" ? "animate-spin" : ""}`} />
                  {regenerating === "role" ? "Regenerating…" : "Regenerate"}
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="stat-card">
                    <span className="text-xs text-textMuted">Title</span>
                    <span className="font-semibold text-textMain">{kit.role?.title || kit.source?.role || "Not specified"}</span>
                  </div>
                  <div className="stat-card">
                    <span className="text-xs text-textMuted">Seniority</span>
                    <span className="font-semibold text-textMain capitalize">{kit.role?.seniority || "Not specified"}</span>
                  </div>
                </div>

                {kit.role?.responsibilities?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-textMain mb-3">Key Responsibilities</h3>
                    <ul className="space-y-2">
                      {kit.role.responsibilities.map((r: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-textSecondary">
                          <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-t border-borderSubtle pt-5">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm font-semibold text-textMain">Extracted Requirements</h3>
                    <span className="badge-cyan text-xs">{mustCount} must-have</span>
                  </div>
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {kit.role?.requirements?.map((req: any) => (
                      <div key={req.id} className="flex items-start gap-3 p-3 rounded-lg bg-surfaceHighlight border border-borderSubtle hover:border-borderStrong transition-colors">
                        <div className="flex gap-1.5 shrink-0 mt-0.5">
                          <span className={req.priority === "must" ? "badge-must" : "badge-nice"}>
                            {req.priority}
                          </span>
                          <span className={`badge text-[10px]
                            ${req.kind === "technical" ? "badge-blue" : req.kind === "behavioural" ? "badge-purple" : "badge-green"}`}>
                            {req.kind}
                          </span>
                        </div>
                        <p className="text-sm text-textSecondary flex-1 leading-relaxed">{req.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─ Questions Bank ─ */}
          {activeTab === "questions" && (
            <div className="animate-fade-in space-y-4">
              <div className="panel overflow-hidden">
                <div className="card-gradient-header card-gradient-technical flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-white/80" />
                    Question Bank
                    <span className="badge-gray text-xs">{kit.questions?.length || 0} questions</span>
                  </div>
                  <button onClick={() => handleRegenerate("questions")} disabled={regenerating === "questions"}
                    className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors">
                    <RefreshCcw className={`w-3.5 h-3.5 ${regenerating === "questions" ? "animate-spin" : ""}`} />
                    {regenerating === "questions" ? "Regenerating…" : "Regenerate"}
                  </button>
                </div>
                <div className="p-5">
                  <p className="text-xs text-textSecondary mb-5">Drag to reorder · Edit inline · Add custom questions</p>
                  <QuestionBoard initialQuestions={kit.questions || []} kitId={kit._id} />
                </div>
              </div>
            </div>
          )}

          {/* ─ Study Schedule ─ */}
          {activeTab === "schedule" && (
            <div className="animate-fade-in space-y-4">
              {selectedDay === null ? (
                <div className="panel overflow-hidden">
                  <div className="card-gradient-header card-gradient-day flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-white/80" />
                      {kit.schedule?.days_available}-Day Study Plan
                    </div>
                    <button onClick={() => handleRegenerate("schedule")} disabled={regenerating === "schedule"}
                      className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors">
                      <RefreshCcw className={`w-3.5 h-3.5 ${regenerating === "schedule" ? "animate-spin" : ""}`} />
                      {regenerating === "schedule" ? "Regenerating…" : "Regenerate"}
                    </button>
                  </div>
                  <div className="p-5 space-y-3">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {kit.schedule?.days?.map((day: any) => (
                      <div
                        key={day.day}
                        onClick={() => setSelectedDay(day.day)}
                        className="card-interactive flex items-center gap-4 p-4 cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex flex-col items-center justify-center shrink-0 shadow-glow-cyan">
                          <span className="text-[10px] text-[#0d1117]/70 font-bold uppercase leading-none">Day</span>
                          <span className="text-lg font-display font-bold text-[#0d1117] leading-none">{day.day}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-textMain text-sm group-hover:text-primary transition-colors truncate">{day.focus}</h4>
                          <p className="text-xs text-textMuted mt-0.5">{day.question_ids?.length || 0} questions</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="badge-gray text-xs">~{day.minutes}m</span>
                          <ChevronRight className="w-4 h-4 text-textMuted group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="animate-slide-up">
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setSelectedDay(null)} className="btn-ghost gap-2 text-sm">
                      <ArrowLeft className="w-4 h-4" /> Back to Schedule
                    </button>
                    <Link href={`/kits/${kit._id}/practice?day=${selectedDay}`} className="btn-primary gap-2 text-sm">
                      <Sparkles className="w-4 h-4" /> Day {selectedDay} Practice
                    </Link>
                  </div>
                  <div className="panel p-5">
                    <h3 className="font-display text-base font-bold mb-4 text-textMain">
                      Questions for Day {selectedDay}
                    </h3>
                    <QuestionBoard
                      initialQuestions={kit.questions?.filter((q: { id: string }) =>
                        kit.schedule?.days?.find((d: { day: number; question_ids: string[] }) =>
                          d.day === selectedDay)?.question_ids.includes(q.id)
                      ) || []}
                      kitId={kit._id}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─ Practice / Flashcards ─ */}
          {activeTab === "flashcards" && (
            <div className="animate-fade-in space-y-4">
              <div className="panel overflow-hidden">
                <div className="card-gradient-header card-gradient-system-design flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-white/80" />
                    Practice Mode
                    <span className="badge-gray text-xs">{kit.flashcards?.length || 0} cards</span>
                  </div>
                  <button onClick={() => handleRegenerate("flashcards")} disabled={regenerating === "flashcards"}
                    className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors">
                    <RefreshCcw className={`w-3.5 h-3.5 ${regenerating === "flashcards" ? "animate-spin" : ""}`} />
                    {regenerating === "flashcards" ? "Regenerating…" : "Regenerate"}
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6 pb-6 border-b border-borderSubtle">
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-textMain mb-1">Ready to test your knowledge?</h3>
                      <p className="text-sm text-textSecondary">
                        {kit.flashcards?.length || 0} AI-generated flashcards based on your kit&apos;s requirements. Cards are ordered by confidence score.
                      </p>
                    </div>
                    <Link href={`/kits/${kit._id}/practice`} className="btn-primary gap-2 shrink-0">
                      <Sparkles className="w-4 h-4" /> Start Session
                    </Link>
                  </div>
                  <FlashcardBoard initialFlashcards={kit.flashcards || []} kitId={kit._id} />
                </div>
              </div>
            </div>
          )}

          {/* ─ Readiness Matrix ─ */}
          {activeTab === "readiness" && (
            <div className="animate-fade-in">
              <div className="panel overflow-hidden">
                <div className="card-gradient-header card-gradient-company-fit flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-white/80" />
                  Readiness Matrix
                </div>
                <div className="p-6">
                  <p className="text-sm text-textSecondary mb-5">
                    Track which requirements you&apos;ve practised and where your confidence gaps are.
                  </p>
                  <ReadinessMatrix kitId={kit._id} requirements={kit.role?.requirements || []} />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── Right sidebar: stats ── */}
        <aside className="hidden xl:flex flex-col w-64 shrink-0 gap-4 sticky top-20">

          {/* Coverage card */}
          <div className="panel p-4">
            <div className="flex items-center gap-2 mb-3">
              {covered ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-warning" />
              )}
              <span className="text-sm font-semibold text-textMain">Coverage</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-textMuted">Must-have covered</span>
                <span className={covered ? "text-success font-semibold" : "text-warning font-semibold"}>
                  {covered ? "100%" : `${Math.round(((mustCount - (kit.coverage?.uncovered_requirement_ids?.length ?? 0)) / mustCount) * 100)}%`}
                </span>
              </div>
              <div className="h-1.5 bg-surfaceHighlight rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${covered ? "bg-success" : "bg-warning"}`}
                  style={{
                    width: mustCount === 0 ? "0%"
                      : `${((mustCount - (kit.coverage?.uncovered_requirement_ids?.length ?? 0)) / mustCount) * 100}%`
                  }}
                />
              </div>
              <p className="text-xs text-textMuted">Passes: {kit.coverage?.passes ?? 0}</p>
            </div>
          </div>

          {/* Schedule stat */}
          {kit.schedule && (
            <div className="panel p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-textMain">Schedule</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-textMuted">Total days</span>
                <span className="text-textMain font-semibold">{kit.schedule.days_available}</span>
              </div>
              {daysLeft(kit) !== null && (
                <div className="flex justify-between text-xs">
                  <span className="text-textMuted">Days left</span>
                  <span className={`font-semibold ${urgent ? "text-red-400" : "text-primary"}`}>
                    {daysLeft(kit)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="panel p-4 space-y-2">
            <h4 className="text-xs font-semibold text-textMuted uppercase tracking-wider mb-2">Quick Actions</h4>
            <Link href={`/kits/${kit._id}/practice`} className="btn-primary w-full text-xs py-2 gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Full Practice Session
            </Link>
            {kit.schedule?.days?.length > 0 && (
              <Link href={`/kits/${kit._id}/practice?day=1`} className="btn-secondary w-full text-xs py-2 gap-2">
                <Calendar className="w-3.5 h-3.5" /> Day 1 Practice
              </Link>
            )}
            <button
              onClick={() => handleRegenerate("questions")}
              disabled={!!regenerating}
              className="btn-secondary w-full text-xs py-2 gap-2"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${regenerating === "questions" ? "animate-spin" : ""}`} />
              Regenerate Questions
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
}
