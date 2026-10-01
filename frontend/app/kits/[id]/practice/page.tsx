"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCcw, Sparkles, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function PracticeSession() {
  const params = useParams();
  const searchParams = useSearchParams();
  const dayParam = searchParams.get('day');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [kit, setKit] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
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
            const dayObj = data.schedule.days.find((d: { day: number, question_ids?: string[] }) => d.day === dayNum);
            if (dayObj) {
              const dayReqIds = new Set<string>();
              const dayQuestions = data.questions.filter((q: { id: string, requirement_ids?: string[] }) => (dayObj.question_ids || []).includes(q.id));
              for (const q of dayQuestions) {
                for (const rid of (q.requirement_ids || [])) {
                  dayReqIds.add(rid);
                }
              }
              targetCards = data.flashcards.filter((fc: { requirement_ids?: string[] }) => 
                fc.requirement_ids?.some((rid: string) => dayReqIds.has(rid))
              );
            }
          }
          setCards(targetCards);
        }
      });
  }, [params.id, dayParam]);

  if (!kit || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-textMuted">
        <RefreshCcw className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p className="text-lg">Loading flashcards...</p>
      </div>
    );
  }

  const handleConfidence = (level: 1 | 2 | 3) => {
    const confidenceMap = { 1: 1, 2: 3, 3: 5 };
    const mappedConfidence = confidenceMap[level];

    fetch(`/api/practice/${params.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashcardId: currentCard.id, confidence: mappedConfidence })
    }).catch(console.error);

    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex === cards.length - 1) {
        setSessionCompleted(true);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 150);
  };

  if (sessionCompleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center animate-fade-in">
        <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6 border border-green-500/30">
          <CheckCircle className="w-12 h-12 text-green-400" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Session Complete!</h2>
        <p className="text-textMuted text-lg mb-8 max-w-md">
          Great job! Your readiness matrix has been updated with your latest scores.
        </p>
        <button onClick={() => router.push(`/kits/${params.id}`)} className="btn-primary px-8 py-3">
          Back to Kit
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex) / cards.length) * 100;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 animate-fade-in relative z-10">
      <div className="flex items-center justify-between mb-8">
        <Link href={`/kits/${params.id}`} className="btn-ghost flex items-center gap-2 pl-0 hover:bg-transparent text-textMuted hover:text-white font-medium">
          <ArrowLeft className="w-5 h-5" /> Back to Kit
        </Link>
        <div className="flex items-center gap-4">
          {dayParam && (
            <span className="text-primary font-bold tracking-wide">Day {dayParam} Practice</span>
          )}
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium shadow-inner shadow-white/5">
            Card {currentIndex + 1} of {cards.length}
          </div>
        </div>
      </div>

      <div className="w-full h-1.5 bg-surfaceHighlight rounded-full mb-12 overflow-hidden shadow-inner">
        <div className="h-full bg-gradient-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="relative perspective-1000 h-[450px] mb-12 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
        <div className={`w-full h-full absolute top-0 left-0 transition-transform duration-700 transform-style-3d ease-[cubic-bezier(0.23,1,0.32,1)] ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* Front */}
          <div className="absolute top-0 left-0 w-full h-full backface-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl">
            <div className="glass-panel w-full h-full p-12 flex flex-col items-center justify-center text-center hover:border-primary/40 transition-colors border-2">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-8">
                Question
              </div>
              <h2 className="text-2xl md:text-4xl font-bold leading-tight">
                {currentCard.front}
              </h2>
              <p className="text-textMuted mt-12 flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity font-medium">
                Click to flip <RefreshCcw className="w-4 h-4" />
              </p>
            </div>
          </div>

          {/* Back */}
          <div className="absolute top-0 left-0 w-full h-full backface-hidden rotate-y-180 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-3xl">
            <div className="glass-panel w-full h-full p-12 flex flex-col items-center justify-center text-center hover:border-secondary/40 transition-colors border-2 bg-surfaceHighlight/50">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-bold uppercase tracking-widest mb-8">
                Answer <Sparkles className="w-3 h-3" />
              </div>
              <div className="prose prose-invert max-w-none w-full">
                <p className="text-xl text-textMain leading-relaxed font-medium">
                  {currentCard.back}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {isFlipped && (
        <div className="animate-slide-up flex flex-col items-center">
          <p className="text-textMuted mb-5 font-medium tracking-wide">How well did you know this?</p>
          <div className="flex gap-4 w-full sm:w-auto">
            <button onClick={(e) => { e.stopPropagation(); handleConfidence(1); }} className="flex-1 sm:flex-none px-8 py-4 rounded-xl bg-red-500/10 text-red-400 font-bold border border-red-500/20 hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/10 transition-all active:scale-[0.98]">
              Again (Hard)
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleConfidence(2); }} className="flex-1 sm:flex-none px-8 py-4 rounded-xl bg-yellow-500/10 text-yellow-400 font-bold border border-yellow-500/20 hover:bg-yellow-500/20 hover:shadow-lg hover:shadow-yellow-500/10 transition-all active:scale-[0.98]">
              Good
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleConfidence(3); }} className="flex-1 sm:flex-none px-8 py-4 rounded-xl bg-green-500/10 text-green-400 font-bold border border-green-500/20 hover:bg-green-500/20 hover:shadow-lg hover:shadow-green-500/10 transition-all active:scale-[0.98]">
              Easy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
