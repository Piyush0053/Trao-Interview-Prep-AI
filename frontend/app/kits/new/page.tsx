"use client";
import { useState, useRef } from "react";
import { ArrowRight, Briefcase, Link as LinkIcon, Calendar, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewKit() {
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/kits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd, company_url: companyUrl, days })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate kit");
      
      router.push(`/kits/${data.kitId}`);
    } catch(err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
      setLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    
    try {
      const text = await file.text();
      const cases = JSON.parse(text);
      if (!Array.isArray(cases)) throw new Error("File must contain a JSON array of cases.");
      
      let successCount = 0;
      for (const item of cases) {
        if (!item.jd || !item.company_url || !item.days) continue;
        
        const res = await fetch("/api/kits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jd: item.jd, company_url: item.company_url, days: item.days })
        });
        if (res.ok) successCount++;
      }
      
      if (successCount > 0) {
        router.push('/dashboard');
      } else {
        throw new Error("No valid cases were processed from the file.");
      }
    } catch(err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 pb-20 pt-10 animate-fade-in relative z-10">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">Generate New Kit</h1>
        <p className="text-textMuted text-lg">Provide the job details to create a tailored preparation schedule.</p>
      </div>

      <div className="glass-panel p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="label flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Job Description
            </label>
            <textarea 
              value={jd}
              onChange={e => setJd(e.target.value)}
              className="input-field min-h-[200px] resize-y"
              placeholder="Paste the full job description here..."
              required
            />
            <p className="text-xs text-textMuted mt-2">
              Include everything from responsibilities to requirements. We&apos;ll extract what matters.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="label flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> Company URL
              </label>
              <input 
                type="url"
                value={companyUrl}
                onChange={e => setCompanyUrl(e.target.value)}
                className="input-field"
                placeholder="https://company.com"
                required
              />
            </div>
            
            <div>
              <label className="label flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Days Available to Prepare
              </label>
              <input 
                type="number"
                min="1"
                max="60"
                value={days}
                onChange={e => setDays(parseInt(e.target.value))}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-borderSubtle flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full md:w-auto px-8 py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Initializing Pipeline...
                </span>
              ) : (
                <>Generate Interview Kit <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <div className="flex items-center gap-3">
              <span className="text-textMuted text-sm">OR</span>
              <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden" 
              />
              <button 
                type="button" 
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary px-6 py-3 flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" /> Batch Upload JSON
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
