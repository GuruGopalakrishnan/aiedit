"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CaptionGroup, RenderJobStatus, RenderQuality } from "@/types";

const ACCEPTED = [".mp4", ".mov", ".webm"];

const QUALITIES: { value: RenderQuality; label: string; hint: string }[] = [
  { value: "draft", label: "Draft", hint: "Fastest" },
  { value: "standard", label: "Standard", hint: "Recommended" },
  { value: "high", label: "High", hint: "Slowest, best quality" },
];

const STATUS_LABEL: Record<RenderJobStatus, string> = {
  QUEUED: "Preparing",
  PROCESSING: "Rendering",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

type Step = "upload" | "transcript" | "review" | "render";

type RenderJobState = {
  id: string;
  status: RenderJobStatus;
  progress: number;
  error?: string;
  downloadUrl: string | null;
};

export default function CreatePage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [transcriptText, setTranscriptText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionGroup[] | null>(null);

  const [quality, setQuality] = useState<RenderQuality>("standard");
  const [starting, setStarting] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [job, setJob] = useState<RenderJobState | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const upload = useCallback(async (file: File) => {
    setUploadError(null);
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setUploadError(`Unsupported file type "${ext}". Please upload MP4, MOV, or WEBM.`);
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("video", file);
    formData.append("name", file.name.replace(/\.[^.]+$/, ""));

    try {
      const res = await fetch("/api/projects", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setProjectId(data.project.id as string);
      setVideoName(file.name);
      setStep("transcript");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed unexpectedly.");
    } finally {
      setUploading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) upload(file);
    },
    [upload]
  );

  const generateCaptions = async () => {
    if (!projectId || !transcriptText.trim()) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const manualRes = await fetch("/api/transcript/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, transcriptText }),
      });
      const manualData = await manualRes.json();
      if (!manualRes.ok) throw new Error(manualData.error || "Could not read that transcript.");

      const analyzeRes = await fetch("/api/analyze-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, mode: "full" }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Caption generation failed.");

      setCaptions(analyzeData.project.captions as CaptionGroup[]);
      setStep("review");
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Caption generation failed unexpectedly.");
    } finally {
      setGenerating(false);
    }
  };

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
    if (!projectId) return;
    setStarting(true);
    setRenderError(null);
    setJob(null);
    setStep("render");
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, quality }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start render.");
      setJob({ id: data.jobId, status: "QUEUED", progress: 0, downloadUrl: null });
      pollJob(data.jobId);
    } catch (e) {
      setRenderError(e instanceof Error ? e.message : "Failed to start render.");
    } finally {
      setStarting(false);
    }
  };

  const isRendering = job && (job.status === "QUEUED" || job.status === "PROCESSING");

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-8 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link href="/dashboard" className="text-xs text-neutral-500 hover:text-neutral-300">
              ← Dashboard
            </Link>
            <h1 className="mt-1 text-xl font-semibold sm:text-2xl">Video + Transcript → Captioned Video</h1>
            <p className="mt-1 text-sm text-neutral-400">
              Upload a video and paste its transcript yourself — skips automatic transcription entirely, so the
              captions always match exactly what you gave it.
            </p>
          </div>
        </div>

        <Steps current={step} />

        {/* Step 1: upload */}
        <section className="mt-6 rounded-xl border border-white/10 bg-neutral-900 p-5">
          <h2 className="text-sm font-semibold">1. Video</h2>

          {!projectId ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                isDragging ? "border-white bg-white/5" : "border-white/20 hover:border-white/40"
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) upload(file);
                }}
              />
              {uploading ? (
                <p className="text-sm text-neutral-300">Uploading…</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-white">Drop a video here</p>
                  <p className="mt-1 text-xs text-neutral-400">or click to browse — MP4, MOV, WEBM (max 500MB, 10 min)</p>
                </>
              )}
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <span className="truncate text-sm text-neutral-200">{videoName}</span>
              <span className="text-xs text-green-400">Uploaded</span>
            </div>
          )}
          {uploadError && <p className="mt-3 text-sm text-red-400">{uploadError}</p>}
        </section>

        {/* Step 2: transcript */}
        {projectId && (
          <section className="mt-4 rounded-xl border border-white/10 bg-neutral-900 p-5">
            <h2 className="text-sm font-semibold">2. Transcript</h2>
            <p className="mt-1 text-xs text-neutral-400">
              Paste the exact words spoken. Add a{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-neutral-300">(0:04)</code> timestamp before each
              sentence for accurate timing — without any, words are spread evenly across the video.
            </p>
            <textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              rows={6}
              placeholder="(0:00) Ok, I am going to test this video. (0:04) Let's see how it works."
              className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-white/40 focus:outline-none"
            />
            {generateError && <p className="mt-2 text-sm text-red-400">{generateError}</p>}
            <button
              onClick={generateCaptions}
              disabled={generating || !transcriptText.trim()}
              className="mt-3 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
            >
              {generating ? "Generating captions…" : "Generate Captions"}
            </button>
          </section>
        )}

        {/* Step 3: review chunks */}
        {captions && captions.length > 0 && (
          <section className="mt-4 rounded-xl border border-white/10 bg-neutral-900 p-5">
            <h2 className="text-sm font-semibold">3. Review</h2>
            <p className="mt-1 text-xs text-neutral-400">{captions.length} caption chunks generated from your transcript.</p>
            <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto pr-1">
              {captions.map((c) => (
                <li key={c.id} className="flex gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm">
                  <span className="shrink-0 font-mono text-xs text-neutral-500">
                    {formatTime(c.start)}–{formatTime(c.end)}
                  </span>
                  <span className="text-neutral-200">{c.text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <p className="text-xs text-neutral-400">Quality</p>
              <div className="mt-1.5 flex gap-1.5">
                {QUALITIES.map((q) => (
                  <button
                    key={q.value}
                    onClick={() => setQuality(q.value)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-left text-sm ${
                      quality === q.value ? "border-white bg-white/10" : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <span className="block">{q.label}</span>
                    <span className="text-xs text-neutral-500">{q.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            {renderError && <p className="mt-3 text-sm text-red-400">{renderError}</p>}
            <button
              onClick={startRender}
              disabled={starting}
              className="mt-4 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
            >
              {starting ? "Starting…" : "Render Video"}
            </button>
          </section>
        )}

        {/* Step 4: render progress + download */}
        {job && (
          <section className="mt-4 rounded-xl border border-white/10 bg-neutral-900 p-5">
            <h2 className="text-sm font-semibold">4. Render</h2>
            <p className="mt-2 text-sm">
              {STATUS_LABEL[job.status]}
              {isRendering ? ` — ${job.progress}%` : ""}
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all ${job.status === "FAILED" ? "bg-red-500" : "bg-white"}`}
                style={{ width: `${job.status === "COMPLETED" ? 100 : job.progress}%` }}
              />
            </div>

            {job.status === "FAILED" && <p className="mt-3 text-sm text-red-400">{job.error}</p>}

            {job.status === "COMPLETED" && job.downloadUrl && (
              <>
                <video controls src={job.downloadUrl} className="mt-4 max-h-96 w-full rounded-lg bg-black" />
                <a
                  href={`${job.downloadUrl}?download=1`}
                  download
                  className="mt-3 block w-full rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-black hover:bg-neutral-200"
                >
                  Download MP4
                </a>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function Steps({ current }: { current: Step }) {
  const order: Step[] = ["upload", "transcript", "review", "render"];
  const labels: Record<Step, string> = { upload: "Video", transcript: "Transcript", review: "Review", render: "Render" };
  const currentIndex = order.indexOf(current);

  return (
    <ol className="mt-5 flex gap-2">
      {order.map((s, i) => (
        <li
          key={s}
          className={`flex-1 rounded-full py-1 text-center text-xs ${
            i <= currentIndex ? "bg-white text-black" : "bg-white/10 text-neutral-500"
          }`}
        >
          {labels[s]}
        </li>
      ))}
    </ol>
  );
}
