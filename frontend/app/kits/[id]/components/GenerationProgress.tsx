"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, XCircle, BrainCircuit } from "lucide-react";

const STEPS = [
  { key: "extractRequirements",          label: "Analysing Job Description",      desc: "Extracting requirements, responsibilities and seniority" },
  { key: "crawlCompanySite",             label: "Researching Company",             desc: "Crawling the company site for culture and hiring signals" },
  { key: "buildCompanyBrief",            label: "Building Company Brief",          desc: "Summarising what they do and how they hire" },
  { key: "findInterviewProcessDiscussion", label: "Finding Interview Insights",    desc: "Searching public discussion of their interview process" },
  { key: "generateQuestions",            label: "Drafting Question Bank",          desc: "Generating category-specific technical and behavioural questions" },
  { key: "generateQuestionsForGaps",     label: "Closing Coverage Gaps",           desc: "Running multi-pass coverage check and filling missing must-haves" },
  { key: "generateFlashcards",           label: "Creating Practice Flashcards",    desc: "Building spaced-repetition flashcards from requirements" },
  { key: "buildSchedule",                label: "Optimising Study Schedule",       desc: "Allocating questions across your available days" },
];

type StepEvent = { step: string; status: string; detail?: string; at?: string };

function getStepState(key: string, events: StepEvent[], stepIdx: number, allSteps: typeof STEPS) {
  const stepEvents = events.filter(e => e.step.startsWith(key));
  const latest = stepEvents[stepEvents.length - 1];
  if (!latest) {
    // If a later step has started, mark this one as completed (pipeline moved on)
    const laterStarted = events.some(e => {
      const eIdx = allSteps.findIndex(s => e.step.startsWith(s.key));
      return eIdx > stepIdx;
    });
    return laterStarted ? "completed" : "pending";
  }
  if (latest.status === "ok" || latest.status === "skipped") return "completed";
  if (latest.status === "running") return "running";
  if (latest.status === "failed")  return "failed";
  return "pending";
}

export default function GenerationProgress({ kitId }: { kitId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<StepEvent[]>([]);

  useEffect(() => {
    const es = new EventSource(`/api/kits/${kitId}/events`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.progress) setEvents(data.progress);
        if (data.status === "ready" || data.status === "failed") {
          es.close();
          window.location.reload();
        }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [kitId]);

  const completedCount = STEPS.filter((s, i) => getStepState(s.key, events, i, STEPS) === "completed").length;
  const progress = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-10 pb-20 animate-fade-in relative z-10">

      {/* Header */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-cyan mb-5">
          <BrainCircuit className="w-7 h-7 text-[#0d1117]" />
        </div>
        <h1 className="font-display text-2xl font-bold text-textMain mb-2">Building Your Kit</h1>
        <p className="text-sm text-textSecondary max-w-sm">
          Our AI pipeline is researching and assembling your personalised interview prep. This usually takes 60–90 seconds.
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-xs mt-6">
          <div className="flex justify-between text-xs text-textMuted mb-1.5">
            <span>Progress</span>
            <span className="text-primary font-semibold">{progress}%</span>
          </div>
          <div className="h-1.5 bg-surfaceHighlight rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all duration-700 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="panel p-6 sm:p-8">
        <div className="space-y-0">
          {STEPS.map((step, idx) => {
            const state   = getStepState(step.key, events, idx, STEPS);
            const stepEvt = events.filter(e => e.step.startsWith(step.key));
            const latest  = stepEvt[stepEvt.length - 1];
            const isLast  = idx === STEPS.length - 1;

            return (
              <div key={step.key} className="flex gap-4 group">
                {/* Left column: icon + line */}
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 z-10
                    ${state === "completed" ? "bg-success/20"
                    : state === "running"   ? "bg-primary/20 ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                    : state === "failed"    ? "bg-accent/20"
                    : "bg-surfaceHighlight"}`}
                  >
                    {state === "completed" ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : state === "running" ? (
                      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                    ) : state === "failed" ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <CircleDashed className="w-3.5 h-3.5 text-textMuted/40" />
                    )}
                  </div>
                  {!isLast && (
                    <div className={`w-px flex-1 my-1 transition-colors duration-500
                      ${state === "completed" ? "bg-success/30" : "bg-borderSubtle"}`}
                    />
                  )}
                </div>

                {/* Right column: content */}
                <div className={`pb-6 flex-1 transition-opacity duration-500 ${state === "pending" ? "opacity-35" : "opacity-100"}`}>
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <h3 className={`text-sm font-semibold transition-colors ${
                      state === "running"   ? "text-primary"
                      : state === "completed" ? "text-textMain"
                      : state === "failed"  ? "text-red-400"
                      : "text-textMuted"}`}
                    >
                      {step.label}
                    </h3>
                    {state === "running" && (
                      <span className="badge-cyan text-[10px] py-0 animate-pulse">Processing…</span>
                    )}
                    {state === "completed" && (
                      <span className="badge-green text-[10px] py-0">Done</span>
                    )}
                    {state === "failed" && (
                      <span className="badge-red text-[10px] py-0">Skipped</span>
                    )}
                  </div>
                  <p className="text-xs text-textMuted leading-relaxed">{step.desc}</p>
                  {latest?.detail && (
                    <p className="text-xs text-primary/80 mt-1 animate-fade-in italic">{latest.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
