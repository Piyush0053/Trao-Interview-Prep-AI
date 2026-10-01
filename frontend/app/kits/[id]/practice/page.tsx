"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw, Sparkles, CheckCircle2, Trophy } from "lucide-react";
import Link from "next/link";

export default function PracticeSession() {
  const params = useParams();
  const searchParams = useSearchParams();
  const dayParam = searchParams.get("day");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [kit, setKit] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [scores, setScores] = useState<Record<number, number>>({});
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/kits/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setKit(data);
        if (data.flashcards) {
          let targetCards = data.flashcards;
          if (dayParam && data.schedule?.days && data.questions) {
            const dayNum = parseInt(dayParam, 10);
            const dayObj = data.schedule.days.find((d: { day: number; question_ids?: string[] }) => d.day === dayNum);
            if (dayObj) {
              const dayReqIds = new Set<string>();
              const dayQs = data.questions.filter((q: { id: string; requirement_ids?: string[] }) =>
                (dayObj.question_ids || []).includes(q.id));
              for (const q of dayQs)
                for (const rid of (q.requirement_ids || []))
                  dayReqIds.add(rid);
              targetCards = data.flashcards.filter((fc: { requirement_ids?: string[] }) =>
                fc.requirement_ids?.some((rid: string) => dayReqIds.has(rid)));
            }
          }
          setCards(targetCards);
        }
      });
  }, [params.id, dayParam]);

  if (!kit || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-textMuted">Loading flashcards…</p>
      </div>
    );
  }

  const handleConfidence = (level: 1 | 2 | 3) => {
    const confidenceMap = { 1: 1, 2: 3, 3: 5 };
    setScores(prev => ({ ...prev, [currentIndex]: level }));

    fetch(`/api/practice/${params.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashcardId: currentCard.id, confidence: confidenceMap[level] })
    }).catch(console.error);

    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex === cards.length - 1) setSessionCompleted(true);
      else setCurrentIndex(prev => prev + 1);
    }, 200);
  };

  /* ── Session complete screen ── */
  if (sessionCompleted) {
    const easyCount   = Object.values(scores).filter(s => s === 3).length;
    const mediumCount = Object.values(scores).filter(s => s === 2).length;
    const hardCount   = Object.values(scores).filter(s => s === 1).length;
    const score       = Math.round((easyCount * 5 + mediumCount * 3 + hardCount * 1) / (cards.length * 5) * 100);

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow-cyan">
          <Trophy className="w-10 h-10 text-[#0d1117]" />
        </div>
        <h1 className="font-display text-3xl font-bold text-textMain mb-2">Session Complete!</h1>
        <p className="text-textSecondary text-sm mb-8">Your readiness matrix has been updated.</p>

        {/* Score breakdown */}
        <div className="panel p-6 mb-8 w-full max-w-sm">
          <div className="text-center mb-5">
            <div className="font-display text-5xl font-bold text-primary">{score}%</div>
            <div className="text-xs text-textMuted mt-1">Overall confidence score</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Easy",   count: easyCount,   cls: "text-success",  bg: "bg-success/10" },
              { label: "Medium", count: mediumCount,  cls: "text-warning",  bg: "bg-warning/10" },
              { label: "Hard",   count: hardCount,    cls: "text-red-400",  bg: "bg-accent/10"  },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-lg p-3 text-center`}>
                <div className={`text-2xl font-display font-bold ${s.cls}`}>{s.count}</div>
                <div className="text-xs text-textMuted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => { setCurrentIndex(0); setIsFlipped(false); setSessionCompleted(false); setScores({}); }}
            className="btn-secondary gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Practice Again
          </button>
          <button onClick={() => router.push(`/kits/${params.id}`)} className="btn-primary gap-2">
            <Sparkles className="w-4 h-4" /> Back to Kit
          </button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress    = (currentIndex / cards.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in relative z-10 flex flex-col min-h-[85vh]">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <Link href={`/kits/${params.id}`} className="btn-ghost gap-2 text-sm pl-0">
          <ArrowLeft className="w-4 h-4" /> Back to Kit
        </Link>
        <div className="flex items-center gap-3">
          {dayParam && (
            <span className="badge-cyan text-xs">Day {dayParam}</span>
          )}
          <span className="badge-gray text-xs">
            {currentIndex + 1} / {cards.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-textMuted mb-1.5">
          <span>Progress</span>
          <span className="text-primary font-semibold">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-surfaceHighlight rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Dots */}
        <div className="flex gap-1 mt-2 justify-center">
          {cards.map((_, i) => {
            const s = scores[i];
            return (
              <div key={i} className={`h-1 rounded-full transition-all duration-300
                ${i === currentIndex ? "w-4 bg-primary" :
                  s === 3 ? "w-2 bg-success" :
                  s === 2 ? "w-2 bg-warning" :
                  s === 1 ? "w-2 bg-red-400" :
                  "w-2 bg-surfaceHighlight"}`}
              />
            );
          })}
        </div>
      </div>

      {/* 3D Flashcard */}
      <div
        className="flex-1 relative perspective-1000 cursor-pointer mb-8"
        style={{ minHeight: "320px" }}
        onClick={() => setIsFlipped(v => !v)}
        role="button"
        aria-label={isFlipped ? "Show question" : "Show answer"}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setIsFlipped(v => !v); }}
      >
        <div className={`w-full h-full absolute inset-0 transition-transform duration-700 transform-style-3d ease-[cubic-bezier(0.23,1,0.32,1)] ${isFlipped ? "rotate-y-180" : ""}`}>

          {/* Front — Question */}
          <div className="absolute inset-0 backface-hidden">
            <div className="w-full h-full panel flex flex-col items-center justify-center text-center p-8 hover:border-borderStrong transition-colors">
              <div className="badge-cyan mb-6 text-xs uppercase tracking-widest py-1 px-4">
                Question
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-textMain leading-tight mb-8">
                {currentCard.front}
              </h2>
              <div className="flex items-center gap-2 text-textMuted text-xs opacity-60">
                <RotateCcw className="w-3.5 h-3.5" />
                Click or press Enter to reveal answer
              </div>
            </div>
          </div>

          {/* Back — Answer */}
          <div className="absolute inset-0 backface-hidden rotate-y-180">
            <div className="w-full h-full panel flex flex-col items-center justify-center text-center p-8 bg-surfaceHover border-primary/20">
              <div className="badge-blue mb-6 text-xs uppercase tracking-widest py-1 px-4 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Answer
              </div>
              <p className="text-textMain text-base sm:text-lg leading-relaxed font-medium max-w-prose">
                {currentCard.back}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Confidence buttons — shown when flipped */}
      <div className={`transition-all duration-300 ${isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        <p className="text-center text-xs text-textMuted mb-4 font-medium">How well did you know this?</p>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); handleConfidence(1); }}
            className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-xl bg-accent/10 border border-red-500/20 text-red-400 hover:bg-accent/20 hover:border-red-500/40 transition-all active:scale-[0.97] font-semibold text-sm"
          >
            <span className="text-xl">😰</span> Hard
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleConfidence(2); }}
            className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-xl bg-warning/10 border border-amber-500/20 text-amber-400 hover:bg-warning/20 hover:border-amber-500/40 transition-all active:scale-[0.97] font-semibold text-sm"
          >
            <span className="text-xl">🤔</span> Medium
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleConfidence(3); }}
            className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-xl bg-success/10 border border-green-500/20 text-green-400 hover:bg-success/20 hover:border-green-500/40 transition-all active:scale-[0.97] font-semibold text-sm"
          >
            <span className="text-xl">😊</span> Easy
          </button>
        </div>
      </div>
    </div>
  );
}
