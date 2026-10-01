"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react";

export default function GenerationProgress({ kitId }: { kitId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const eventSource = new EventSource(`/api/kits/${kitId}/events`);
    
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.progress) {
          setEvents(data.progress);
        }
        if (data.status === 'ready' || data.status === 'failed') {
          eventSource.close();
          window.location.reload();
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => eventSource.close();
  }, [kitId]);

  const steps = [
    { key: "extractRequirements", label: "Analyzing Job Description" },
    { key: "crawlCompanySite", label: "Researching Company Culture" },
    { key: "buildCompanyBrief", label: "Generating Company Brief" },
    { key: "findInterviewProcessDiscussion", label: "Finding Interview Processes" },
    { key: "generateQuestions", label: "Drafting Technical Questions" },
    { key: "generateQuestionsForGaps", label: "Checking Requirement Coverage" },
    { key: "generateFlashcards", label: "Creating Practice Flashcards" },
    { key: "buildSchedule", label: "Optimizing Study Schedule" }
  ];

  return (
    <div className="max-w-3xl mx-auto mt-20 px-6 animate-fade-in relative z-10">
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center text-primary mb-6 shadow-lg shadow-primary/20">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Building Your Kit</h2>
        <p className="text-textMuted text-lg">Our AI is researching and assembling your personalized interview prep.</p>
      </div>

      <div className="glass-panel p-8 md:p-10">
        <div className="space-y-8">
          {steps.map((step, idx) => {
            const stepEvents = events.filter(e => e.step.startsWith(step.key));
            const latestEvent = stepEvents[stepEvents.length - 1];
            
            let isCompleted = false;
            let isRunning = false;
            let isFailed = false;

            if (latestEvent) {
              if (latestEvent.status === 'ok' || latestEvent.status === 'skipped') isCompleted = true;
              if (latestEvent.status === 'running') isRunning = true;
              if (latestEvent.status === 'failed') isFailed = true;
            }

            const hasStartedLaterStep = events.some(e => {
              const eIdx = steps.findIndex(s => e.step.startsWith(s.key));
              return eIdx > idx;
            });
            
            if (hasStartedLaterStep && !isCompleted && !isFailed) {
              isCompleted = true;
            }

            return (
              <div key={step.key} className={`flex items-start gap-5 transition-all duration-500 ${isCompleted || isRunning ? "opacity-100 transform translate-x-0" : "opacity-30 transform -translate-x-2"}`}>
                <div className="mt-0.5 shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                  ) : isFailed ? (
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    </div>
                  ) : isRunning ? (
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  ) : (
                    <CircleDashed className="w-6 h-6 text-textMuted/50" />
                  )}
                </div>
                <div>
                  <h4 className={`text-lg font-medium transition-colors ${isRunning ? "text-primary" : "text-textMain"}`}>{step.label}</h4>
                  {latestEvent?.detail && (
                    <p className="text-sm text-textMuted mt-1.5 animate-fade-in">{latestEvent.detail}</p>
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
