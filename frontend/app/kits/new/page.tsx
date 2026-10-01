"use client";
import { useState, useRef } from "react";
import { ArrowRight, Briefcase, Link as LinkIcon, Calendar, Upload, AlertCircle, FileJson } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewKit() {
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

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
      if (successCount > 0) router.push("/dashboard");
      else throw new Error("No valid cases were processed from the file.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-20 pt-8 animate-fade-in relative z-10">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-textMain mb-1">Generate New Kit</h1>
        <p className="text-sm text-textSecondary">
          Paste a job description and company URL. Our AI will research the company and build your personalised prep kit.
        </p>
      </div>

      <div className="panel overflow-hidden">
        {/* Top gradient strip */}
        <div className="card-gradient-header card-gradient-day flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-white/80" />
          New Interview Prep Kit
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6" id="new-kit-form">

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Job Description */}
          <div>
            <label className="label" htmlFor="jd-textarea">
              <Briefcase className="w-3 h-3 inline mr-1" />
              Job Description
            </label>
            <textarea
              id="jd-textarea"
              value={jd}
              onChange={e => setJd(e.target.value)}
              className="input-field min-h-[200px] resize-y font-mono text-xs leading-relaxed"
              placeholder="Paste the full job description here — responsibilities, requirements, company context…"
              required
            />
            <p className="text-xs text-textMuted mt-1.5">
              Include everything. We extract what matters and skip the boilerplate.
            </p>
          </div>

          {/* URL + Days row */}
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="label" htmlFor="company-url">
                <LinkIcon className="w-3 h-3 inline mr-1" />
                Company Website URL
              </label>
              <input
                id="company-url"
                type="url"
                value={companyUrl}
                onChange={e => setCompanyUrl(e.target.value)}
                className="input-field"
                placeholder="https://company.com"
                required
              />
              <p className="text-xs text-textMuted mt-1.5">
                We&apos;ll crawl the site to find what they do and how they hire.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="days-input">
                <Calendar className="w-3 h-3 inline mr-1" />
                Days Available to Prepare
              </label>
              <input
                id="days-input"
                type="number"
                min="1"
                max="60"
                value={days}
                onChange={e => setDays(parseInt(e.target.value))}
                className="input-field"
                required
              />
              <p className="text-xs text-textMuted mt-1.5">
                We&apos;ll allocate questions and topics across exactly this many days.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2 border-t border-borderSubtle">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary gap-2 py-2.5 text-sm"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#0d1117]/30 border-t-[#0d1117] rounded-full animate-spin" />
                  Starting pipeline…
                </>
              ) : (
                <>Generate Interview Kit <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs text-textMuted">or</span>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                id="batch-upload"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary gap-2 py-2 text-xs"
              >
                <FileJson className="w-4 h-4" />
                Batch Upload JSON
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Help box */}
      <div className="mt-6 panel p-5 flex gap-4 items-start">
        <Upload className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-textMain mb-1">Preparing multiple roles?</h3>
          <p className="text-xs text-textSecondary leading-relaxed">
            Upload a JSON file with an array of{" "}
            <code className="text-primary bg-surfaceHighlight px-1 py-0.5 rounded text-[10px]">
              {`{ jd, company_url, days }`}
            </code>{" "}
            objects to kick off a batch of kits at once. Each will be processed sequentially.{" "}
            <a
              href="/cases.json"
              download="cases.json"
              className="text-primary hover:underline inline-flex items-center gap-1 font-medium mt-1 block sm:inline"
            >
              Download sample JSON template &rarr;
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
