"use client";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Target } from "lucide-react";

type RequirementType = {
  id: string;
  text: string;
  kind: string;
  priority: string;
};

type CardStats = {
  timesReviewed: number;
  avgConfidence: number;
};

type FlashcardType = {
  id: string;
  requirement_ids?: string[];
  stats?: CardStats;
};

type PracticeData = {
  flashcards: FlashcardType[];
};

type ReqStat = RequirementType & {
  cardCount: number;
  reviewedCount: number;
  avgConfidence: number;
};

export default function ReadinessMatrix({ kitId, requirements }: { kitId: string; requirements: RequirementType[] }) {
  const [data, setData] = useState<PracticeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/practice/${kitId}`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [kitId]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || !data.flashcards || data.flashcards.length === 0) {
    return (
      <div className="text-center p-8 text-textMuted">
        <p>No practice data available yet. Start a practice session first!</p>
      </div>
    );
  }

  // Calculate stats per requirement
  const reqStats = requirements.map(req => {
    const relatedCards = data.flashcards.filter((f: FlashcardType) => f.requirement_ids?.includes(req.id));
    const reviewedCards = relatedCards.filter((f: FlashcardType) => f.stats && f.stats.timesReviewed > 0);
    
    let avgConfidence = 0;
    if (reviewedCards.length > 0) {
      const sum = reviewedCards.reduce((acc: number, f: FlashcardType) => acc + (f.stats?.avgConfidence || 0), 0);
      avgConfidence = sum / reviewedCards.length;
    }

    return {
      ...req,
      cardCount: relatedCards.length,
      reviewedCount: reviewedCards.length,
      avgConfidence
    };
  });

  const weakSpots = reqStats.filter((r: ReqStat) => r.reviewedCount > 0 && r.avgConfidence < 3.0);
  const strongSpots = reqStats.filter((r: ReqStat) => r.reviewedCount > 0 && r.avgConfidence >= 4.0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-6 border-l-4 border-l-red-500/50">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-red-400 w-5 h-5" />
            <h3 className="text-lg font-bold">Weak Spots</h3>
          </div>
          {weakSpots.length === 0 ? (
            <p className="text-textMuted text-sm">No weak spots identified yet.</p>
          ) : (
            <ul className="space-y-3">
              {weakSpots.map((r: ReqStat) => (
                <li key={r.id} className="text-sm bg-red-500/10 text-red-300 px-3 py-2 rounded-md">
                  <span className="font-semibold block mb-1">Score: {r.avgConfidence.toFixed(1)}/5</span>
                  {r.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card p-6 border-l-4 border-l-green-500/50">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="text-green-400 w-5 h-5" />
            <h3 className="text-lg font-bold">Strong Spots</h3>
          </div>
          {strongSpots.length === 0 ? (
            <p className="text-textMuted text-sm">Keep practicing to build your strong spots.</p>
          ) : (
            <ul className="space-y-3">
              {strongSpots.map((r: ReqStat) => (
                <li key={r.id} className="text-sm bg-green-500/10 text-green-300 px-3 py-2 rounded-md">
                  <span className="font-semibold block mb-1">Score: {r.avgConfidence.toFixed(1)}/5</span>
                  {r.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Target className="text-primary w-5 h-5" />
          <h3 className="text-lg font-bold">Full Requirements Matrix</h3>
        </div>
        <div className="space-y-4">
          {reqStats.map((r: ReqStat) => (
            <div key={r.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex-grow pr-4 mb-3 md:mb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-sm uppercase tracking-wider font-bold ${r.priority === 'must' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-textMuted'}`}>
                    {r.priority}
                  </span>
                  <span className="text-xs text-textMuted">{r.kind}</span>
                </div>
                <p className="text-sm font-medium">{r.text}</p>
              </div>
              <div className="shrink-0 flex items-center gap-4 text-sm">
                <div className="text-right">
                  <p className="text-textMuted text-xs">Coverage</p>
                  <p className="font-bold">{r.cardCount} cards</p>
                </div>
                <div className="text-right min-w-[80px]">
                  <p className="text-textMuted text-xs">Avg Score</p>
                  <p className={`font-bold ${r.reviewedCount === 0 ? 'text-textMuted' : r.avgConfidence >= 4.0 ? 'text-green-400' : r.avgConfidence < 3.0 ? 'text-red-400' : 'text-yellow-400'}`}>
                    {r.reviewedCount > 0 ? r.avgConfidence.toFixed(1) : '-'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
