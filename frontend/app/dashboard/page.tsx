"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Plus, Calendar, FileText, ChevronRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type KitSummary = {
  _id: string;
  status: string;
  source?: { role?: string; company?: string };
  createdAt: string;
  schedule?: { days_available?: number };
};

export default function Dashboard() {
  const [kits, setKits] = useState([]);
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
      .then(data => {
        setKits(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleDelete = async (e: React.MouseEvent, kitId: string) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this kit? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`/api/kits/${kitId}`, { method: 'DELETE' });
      if (res.ok) {
        setKits(kits.filter((k: KitSummary) => k._id !== kitId));
      } else {
        throw new Error("Failed to delete kit");
      }
    } catch (err) {
      console.error("Delete kit error:", err);
      alert("An error occurred while deleting the kit.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pb-20 pt-10 animate-fade-in relative z-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Kits</h1>
          <p className="text-textMuted text-lg">Manage your interview preparation</p>
        </div>
        <Link href="/kits/new" className="btn-primary flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" /> Generate New Kit
        </Link>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card h-48 animate-pulse bg-white/5"></div>
          ))}
        </div>
      ) : kits.length === 0 ? (
        <div className="glass-panel text-center py-24 px-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-borderStrong">
            <FileText className="w-8 h-8 text-textMuted" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">No kits yet</h2>
          <p className="text-textMuted mb-8 max-w-md">
            You haven&apos;t generated any interview preparation kits yet. Start by pasting a job description.
          </p>
          <Link href="/kits/new" className="btn-primary flex items-center gap-2">
            Create First Kit <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kits.map((kit: KitSummary) => (
            <Link href={`/kits/${kit._id}`} key={kit._id} className="block group">
              <div className="glass-card p-6 h-full flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/20 transition-colors pointer-events-none" />

                <div className="flex justify-between items-start mb-6">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-medium text-textMuted capitalize">
                    {kit.status}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleDelete(e, kit._id)}
                      className="relative z-10 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                      title="Delete Kit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {kit.status === 'ready' && (
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-textMuted group-hover:bg-primary group-hover:text-white transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2 truncate pr-6 group-hover:text-primary transition-colors">
                  {kit.source?.role || "New Kit"}
                </h3>
                <p className="text-textMuted text-sm mb-6 flex-grow">
                  {kit.source?.company || "Unknown Company"}
                </p>

                <div className="flex items-center gap-4 text-xs text-textMuted pt-4 border-t border-borderSubtle">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(kit.createdAt).toLocaleDateString()}
                  </span>
                  {kit.schedule?.days_available && (
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      {kit.schedule.days_available} days plan
                    </span>
                  )}
                  {kit.schedule?.days_available && (
                    <span className={`flex items-center gap-1.5 ml-auto font-bold ${Math.max(0, kit.schedule.days_available - Math.floor((new Date().getTime() - new Date(kit.createdAt).getTime()) / (1000 * 60 * 60 * 24))) <= 2 ? 'text-red-400' : 'text-primary'}`}>
                      {Math.max(0, kit.schedule.days_available - Math.floor((new Date().getTime() - new Date(kit.createdAt).getTime()) / (1000 * 60 * 60 * 24)))} days left
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
