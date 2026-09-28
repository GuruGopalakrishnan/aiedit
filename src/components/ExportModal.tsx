"use client";

import { useEffect, useRef, useState } from "react";
import type { RenderJob, RenderQuality } from "@/types";

const QUALITIES: { value: RenderQuality; label: string; hint: string }[] = [
  { value: "draft", label: "Draft", hint: "Fastest, lower quality" },
  { value: "standard", label: "Standard", hint: "Recommended" },
  { value: "high", label: "High", hint: "Slower, best quality" },
];

const STATUS_LABEL: Record<RenderJob["status"], string> = {
  QUEUED: "Preparing",
  PROCESSING: "Rendering",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

type PolledJob = RenderJob & { downloadUrl: string | null };

export function ExportModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [quality, setQuality] = useState<RenderQuality>("standard");
  const [job, setJob] = useState<PolledJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollJob = (jobId: string) => {
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/render/${jobId}`);
      const data = await res.json();
      if (!res.ok) return;
      setJob(data.job);
      if (data.job.status === "COMPLETED" || data.job.status === "FAILED") {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 1000);
  };

  const startRender = async () => {
    setStarting(true);
    setError(null);
    setJob(null);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, quality }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start render.");
      setJob({
        id: data.jobId,
        projectId,
        status: "QUEUED",
        progress: 0,
        quality,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        downloadUrl: null,
      });
      pollJob(data.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start render.");
    } finally {
      setStarting(false);
    }
  };

  const isRendering = job && (job.status === "QUEUED" || job.status === "PROCESSING");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-neutral-900 p-5 text-white">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Export Video</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>

        {!job && (
          <>
            <p className="mt-3 text-xs text-neutral-400">Quality</p>
            <div className="mt-1.5 space-y-1.5">
              {QUALITIES.map((q) => (
                <button
                  key={q.value}
                  onClick={() => setQuality(q.value)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                    quality === q.value ? "border-white bg-white/10" : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <span>{q.label}</span>
                  <span className="text-xs text-neutral-500">{q.hint}</span>
                </button>
              ))}
            </div>

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

            <button
              onClick={startRender}
              disabled={starting}
              className="mt-4 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
            >
              {starting ? "Starting…" : "Render"}
            </button>
          </>
        )}

        {job && (
          <div className="mt-4">
            <p className="text-sm">
              {STATUS_LABEL[job.status]}
              {isRendering ? ` — ${job.progress}%` : ""}
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${job.status === "FAILED" ? "bg-red-500" : "bg-white"}`}
                style={{ width: `${job.status === "COMPLETED" ? 100 : job.progress}%` }}
              />
            </div>

            {job.status === "FAILED" && <p className="mt-3 text-xs text-red-400">{job.error}</p>}

            {job.status === "COMPLETED" && job.downloadUrl && (
              <a
                href={`${job.downloadUrl}?download=1`}
                download
                className="mt-4 block w-full rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-black hover:bg-neutral-200"
              >
                Download MP4
              </a>
            )}

            {(job.status === "COMPLETED" || job.status === "FAILED") && (
              <button
                onClick={() => setJob(null)}
                className="mt-2 w-full rounded-lg border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
              >
                Render again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
