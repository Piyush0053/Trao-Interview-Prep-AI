"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import GenerationProgress from "./components/GenerationProgress";
import EditableField from "./components/EditableField";
import QuestionBoard from "./components/QuestionBoard";
import FlashcardBoard from "./components/FlashcardBoard";
import ReadinessMatrix from "./components/ReadinessMatrix";
import { FileText, Calendar, BrainCircuit, Sparkles, BookOpen, ArrowLeft, BarChart2, RefreshCcw } from "lucide-react";
import Link from "next/link";

export default function KitDetail() {
  const params = useParams();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [kit, setKit] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("brief");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const handleRegenerate = async (section: string) => {
    if (!confirm(`Are you sure you want to regenerate the ${section} section? This will use AI to overwrite unpinned changes.`)) return;
    
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
      if (err instanceof Error) alert(`Failed to regenerate: ${err.message}`);
      else alert(`Failed to regenerate: ${String(err)}`);
    } finally {
      setRegenerating(null);
    }
  };

  const handleUpdateBrief = async (field: 'summary' | 'what_they_do', value: string) => {
    const updatedBrief = {
      ...(kit.company_brief || {}),
      [field]: value
    };
    const res = await fetch(`/api/kits/${kit._id}/brief`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: updatedBrief, updatedAt: kit.updatedAt })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update company brief");
    }
    const updatedKit = await res.json();
    setKit(updatedKit);
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
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (kit.status !== 'ready' && kit.status !== 'failed') {
    return <GenerationProgress kitId={params.id as string} />;
  }

  if (kit.status === 'failed') {
    return (
      <div className="max-w-3xl mx-auto mt-20 p-8 glass-panel text-center">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Generation Failed</h2>
        <p className="text-textMuted mb-6">We encountered an error while building your interview kit.</p>
        <button onClick={() => router.push("/dashboard")} className="btn-secondary">Return to Dashboard</button>
      </div>
    );
  }

  const tabs = [
    { id: "brief", label: "Company Brief", icon: FileText },
    { id: "role", label: "Role & Requirements", icon: Sparkles },
    { id: "questions", label: "Questions Bank", icon: BrainCircuit },
    { id: "schedule", label: "Study Schedule", icon: Calendar },
    { id: "flashcards", label: "Practice", icon: BookOpen },
    { id: "readiness", label: "Readiness Matrix", icon: BarChart2 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20 pt-8 animate-fade-in relative z-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider border border-primary/20">
            Ready to Study
          </div>
          {kit.schedule?.days_available && (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
              Math.max(0, kit.schedule.days_available - Math.floor((new Date().getTime() - new Date(kit.createdAt).getTime()) / (1000 * 60 * 60 * 24))) <= 2 
                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                : 'bg-white/5 text-textMuted border-white/10'
            }`}>
              <Calendar className="w-3.5 h-3.5" />
              {Math.max(0, kit.schedule.days_available - Math.floor((new Date().getTime() - new Date(kit.createdAt).getTime()) / (1000 * 60 * 60 * 24)))} Days Left
            </div>
          )}
        </div>
        <h1 className="text-4xl font-bold mb-2">{kit.source?.role || "Interview Kit"}</h1>
        <p className="text-textMuted text-lg flex items-center gap-2">
          {kit.source?.company || "Unknown Company"}
          {kit.source?.company_url && (
             <a href={kit.source.company_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm ml-2 font-medium">
               (Visit Site)
             </a>
          )}
        </p>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="flex overflow-x-auto border-b border-borderStrong no-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-all whitespace-nowrap outline-none ${
                  isActive 
                    ? "text-primary border-b-2 border-primary bg-primary/5" 
                    : "text-textMuted hover:text-textMain hover:bg-white/5"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
        
        <div className="p-8 min-h-[500px]">
          {activeTab === "brief" && (
            <div className="animate-fade-in space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Company Overview</h2>
                  <button onClick={() => handleRegenerate('brief')} disabled={regenerating === 'brief'} className="btn-secondary text-sm py-1.5 flex items-center gap-2">
                    <RefreshCcw className={`w-4 h-4 ${regenerating === 'brief' ? 'animate-spin' : ''}`} /> 
                    {regenerating === 'brief' ? 'Regenerating...' : 'Regenerate Brief'}
                  </button>
                </div>
                <EditableField 
                  initialValue={kit.company_brief?.summary || ""} 
                  field="company_brief.summary" 
                  kitId={kit._id} 
                  isTextArea 
                  onSave={(val) => handleUpdateBrief('summary', val)}
                />
              </div>
              
              <div className="pt-8 border-t border-borderSubtle">
                <h3 className="text-xl font-semibold mb-4">What They Do</h3>
                <EditableField 
                  initialValue={kit.company_brief?.what_they_do || ""} 
                  field="company_brief.what_they_do" 
                  kitId={kit._id} 
                  isTextArea 
                  onSave={(val) => handleUpdateBrief('what_they_do', val)}
                />
              </div>
            </div>
          )}

          {activeTab === "schedule" && (
            <div className="animate-fade-in space-y-6">
              {selectedDay === null ? (
                <>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold">Your {kit.schedule?.days_available}-Day Plan</h2>
                    <button onClick={() => handleRegenerate('schedule')} disabled={regenerating === 'schedule'} className="btn-secondary text-sm py-1.5 flex items-center gap-2">
                      <RefreshCcw className={`w-4 h-4 ${regenerating === 'schedule' ? 'animate-spin' : ''}`} /> 
                      {regenerating === 'schedule' ? 'Regenerating...' : 'Regenerate Schedule'}
                    </button>
                  </div>
                  <div className="grid gap-4">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {kit.schedule?.days?.map((day: any) => (
                      <div key={day.day} onClick={() => setSelectedDay(day.day)} className="glass-card p-6 flex flex-col md:flex-row gap-6 items-start md:items-center cursor-pointer hover:border-primary/50 transition-all hover:scale-[1.01] group">
                        <div className="w-16 h-16 rounded-2xl bg-surfaceHighlight flex flex-col items-center justify-center shrink-0 border border-borderSubtle shadow-inner group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
                          <span className="text-xs text-textMuted uppercase font-bold tracking-wider">Day</span>
                          <span className="text-2xl font-bold text-primary">{day.day}</span>
                        </div>
                        <div className="flex-grow">
                          <h4 className="text-xl font-bold mb-1 text-textMain group-hover:text-primary transition-colors">{day.focus}</h4>
                          <p className="text-sm text-textMuted">{day.question_ids?.length || 0} questions • Carefully tailored review</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-sm font-medium text-textMuted">
                            ~{day.minutes} mins
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="animate-slide-up space-y-8">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setSelectedDay(null)} className="btn-ghost flex items-center gap-2 pl-0 text-textMuted hover:text-white">
                      <ArrowLeft className="w-5 h-5" /> Back to Schedule
                    </button>
                    <Link href={`/kits/${kit._id}/practice?day=${selectedDay}`} className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5">
                      <Sparkles className="w-4 h-4" /> Day {selectedDay} Practice Mode
                    </Link>
                  </div>
                  
                  <div className="border-t border-borderSubtle pt-8">
                    <h3 className="text-xl font-bold mb-6">Questions for Day {selectedDay}</h3>
                    <QuestionBoard 
                      initialQuestions={kit.questions?.filter((q: { id: string }) => 
                        kit.schedule?.days?.find((d: { day: number, question_ids: string[] }) => d.day === selectedDay)?.question_ids.includes(q.id)
                      ) || []} 
                      kitId={kit._id} 
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "questions" && (
            <div className="animate-fade-in space-y-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold">Technical Question Bank</h2>
                  <p className="text-textMuted">Drag to reorder priority</p>
                </div>
                <button onClick={() => handleRegenerate('questions')} disabled={regenerating === 'questions'} className="btn-secondary text-sm py-1.5 flex items-center gap-2">
                  <RefreshCcw className={`w-4 h-4 ${regenerating === 'questions' ? 'animate-spin' : ''}`} /> 
                  {regenerating === 'questions' ? 'Regenerating...' : 'Regenerate Questions'}
                </button>
              </div>
              <QuestionBoard initialQuestions={kit.questions || []} kitId={kit._id} />
            </div>
          )}

          {activeTab === "flashcards" && (
            <div className="animate-fade-in flex flex-col items-center justify-center py-10 text-center">
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-primary flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(139,92,246,0.3)]">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Practice Mode</h2>
              <p className="text-textMuted text-lg mb-10 max-w-md leading-relaxed">
                Test your knowledge with <span className="text-textMain font-semibold">{kit.flashcards?.length || 0} AI-generated flashcards</span> based on the job requirements.
              </p>
              <div className="flex items-center gap-4 mb-16">
                <Link href={`/kits/${kit._id}/practice`} className="btn-primary flex items-center gap-3 text-lg px-8 py-4">
                  Start Session <Sparkles className="w-5 h-5" />
                </Link>
                <button onClick={() => handleRegenerate('flashcards')} disabled={regenerating === 'flashcards'} className="btn-secondary text-lg px-8 py-4 flex items-center gap-3">
                  <RefreshCcw className={`w-5 h-5 ${regenerating === 'flashcards' ? 'animate-spin' : ''}`} /> 
                </button>
              </div>

              <div className="w-full text-left border-t border-borderSubtle pt-10">
                <FlashcardBoard initialFlashcards={kit.flashcards || []} kitId={kit._id} />
              </div>
            </div>
          )}

          {activeTab === "readiness" && (
            <div className="animate-fade-in space-y-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Readiness Matrix</h2>
                <p className="text-textMuted">Identify weak spots and track progress</p>
              </div>
              <ReadinessMatrix kitId={kit._id} requirements={kit.role?.requirements || []} />
            </div>
          )}

          {activeTab === "role" && (
            <div className="animate-fade-in space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Role Profile</h2>
                  <button onClick={() => handleRegenerate('role')} disabled={regenerating === 'role'} className="btn-secondary text-sm py-1.5 flex items-center gap-2">
                    <RefreshCcw className={`w-4 h-4 ${regenerating === 'role' ? 'animate-spin' : ''}`} /> 
                    {regenerating === 'role' ? 'Regenerating...' : 'Regenerate Role'}
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="glass-card p-4">
                    <span className="text-textMuted text-sm block mb-1">Title</span>
                    <span className="font-semibold text-lg">{kit.role?.title || kit.source?.role || "Not specified"}</span>
                  </div>
                  <div className="glass-card p-4">
                    <span className="text-textMuted text-sm block mb-1">Seniority</span>
                    <span className="font-semibold text-lg capitalize">{kit.role?.seniority || "Not specified"}</span>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-4">Key Responsibilities</h3>
                {kit.role?.responsibilities?.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2 text-textMain">
                    {kit.role.responsibilities.map((resp: string, i: number) => (
                      <li key={i}>{resp}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-textMuted italic">No responsibilities extracted.</p>
                )}
              </div>

              <div className="pt-8 border-t border-borderSubtle">
                <h3 className="text-xl font-bold mb-4">Extracted Requirements</h3>
                {kit.role?.requirements?.length > 0 ? (
                  <div className="space-y-4">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {kit.role.requirements.map((req: any) => (
                      <div key={req.id} className="glass-card p-4 flex flex-col md:flex-row md:items-center gap-4 hover:border-primary/30 transition-colors">
                        <div className="shrink-0 flex items-center gap-2 md:flex-col md:items-start md:w-32">
                          <span className={`text-xs px-2 py-0.5 rounded-sm uppercase tracking-wider font-bold ${req.priority === 'must' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-textMuted'}`}>
                            {req.priority}
                          </span>
                          <span className="text-xs text-textMuted bg-white/5 px-2 py-0.5 rounded-sm">{req.kind}</span>
                        </div>
                        <p className="font-medium text-textMain flex-grow">{req.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-textMuted italic">No specific requirements extracted.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
