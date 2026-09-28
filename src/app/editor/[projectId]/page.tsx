"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { CaptionEditor } from "@/components/CaptionEditor";
import { toMediaUrl } from "@/lib/mediaUrl";
import type { CaptionGroup, Project } from "@/types";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const STATUS_LABEL: Record<Project["status"], string> = {
  draft: "Draft",
  transcribing: "Transcribing…",
  ready: "Ready",
  rendering: "Rendering",
  rendered: "Rendered",
  failed: "Failed",
};

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load project.");
      setProject(data.project);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load project.");
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const runTranscription = useCallback(async () => {
    setTranscribing(true);
    setTranscribeError(null);
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed.");
      setProject(data.project);
    } catch (e) {
      setTranscribeError(e instanceof Error ? e.message : "Transcription failed unexpectedly.");
      load();
    } finally {
      setTranscribing(false);
    }
  }, [projectId, load]);

  const runCaptionAnalysis = useCallback(
    async (mode: "full" | "highlights") => {
      if (
        mode === "full" &&
        project &&
        project.captions.length > 0 &&
        !confirm("This replaces the current caption chunks and any manual edits. Continue?")
      ) {
        return;
      }
      setGeneratingCaptions(true);
      setCaptionError(null);
      try {
        const res = await fetch("/api/analyze-captions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, mode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Caption generation failed.");
        setProject(data.project);
      } catch (e) {
        setCaptionError(e instanceof Error ? e.message : "Caption generation failed unexpectedly.");
      } finally {
        setGeneratingCaptions(false);
      }
    },
    [projectId, project]
  );

  const updateCaptionLocally = useCallback((updated: CaptionGroup) => {
    setProject((prev) =>
      prev ? { ...prev, captions: prev.captions.map((c) => (c.id === updated.id ? updated : c)) } : prev
    );
  }, []);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-red-400">
        {error}
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        Loading project…
      </main>
    );
  }

  const videoUrl = toMediaUrl(project.video?.originalPath);
  const hasTranscript = project.transcript.length > 0;
  const hasCaptions = project.captions.length > 0;
  const showTranscribeAction =
    project.video && !transcribing && (project.status === "draft" || project.status === "failed" || !hasTranscript);

  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div>
          <p className="text-sm font-medium">{project.name}</p>
          <p className="text-xs text-neutral-500">{STATUS_LABEL[project.status]}</p>
        </div>
        <button className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200">
          Export Video
        </button>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <section className="flex flex-1 items-center justify-center bg-black p-6">
          {videoUrl ? (
            <div className="aspect-[9/16] max-h-[70vh] w-auto">
              <VideoPlayer src={videoUrl} />
            </div>
          ) : (
            <p className="text-neutral-500">No video attached to this project.</p>
          )}
        </section>

        <aside className="w-full border-t border-white/10 bg-neutral-900 p-5 lg:w-80 lg:border-l lg:border-t-0">
          <h2 className="text-sm font-semibold text-neutral-300">Caption Settings</h2>
          <p className="mt-2 text-xs text-neutral-500">
            Presets, fonts, colors, positioning, and animations will appear here once the animated
            preview (Phase 4/5) is wired up.
          </p>

          {project.video && (
            <div className="mt-6 space-y-1 text-xs text-neutral-400">
              <p>Duration: {formatDuration(project.video.duration)}</p>
              <p>
                Resolution: {project.video.width}×{project.video.height} ({project.video.aspectRatio})
              </p>
              <p>Size: {(project.video.fileSize / (1024 * 1024)).toFixed(1)} MB</p>
            </div>
          )}
        </aside>
      </div>

      <section className="border-t border-white/10 bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold text-neutral-300">Timeline</h2>
        <p className="mt-2 text-xs text-neutral-500">
          {hasCaptions
            ? `${project.captions.length} caption block${project.captions.length === 1 ? "" : "s"}. A visual timeline with click-to-seek lands with the animated preview (Phase 4).`
            : "Caption blocks will appear here once captions are generated."}
        </p>
      </section>

      <section className="border-t border-white/10 bg-neutral-950 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-300">Transcript &amp; Captions</h2>
          <div className="flex items-center gap-2">
            {showTranscribeAction && (
              <button
                onClick={runTranscription}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200"
              >
                {project.status === "failed" ? "Retry Transcription" : "Transcribe"}
              </button>
            )}
            {hasTranscript && !generatingCaptions && (
              <>
                <button
                  onClick={() => runCaptionAnalysis("full")}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-neutral-200"
                >
                  {hasCaptions ? "Regenerate Captions" : "Generate Captions"}
                </button>
                {hasCaptions && (
                  <button
                    onClick={() => runCaptionAnalysis("highlights")}
                    className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                  >
                    Regenerate Highlights
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {transcribing && <p className="mt-2 text-xs text-neutral-400">Transcribing speech…</p>}
        {generatingCaptions && <p className="mt-2 text-xs text-neutral-400">Preparing captions…</p>}
        {transcribeError && <p className="mt-2 text-xs text-red-400">{transcribeError}</p>}
        {captionError && <p className="mt-2 text-xs text-red-400">{captionError}</p>}

        {hasTranscript && !hasCaptions && (
          <p className="mt-3 text-sm leading-relaxed text-neutral-400">
            {project.transcript.map((w) => w.text).join(" ")}
          </p>
        )}

        {!hasTranscript && !transcribing && (
          <p className="mt-2 text-sm text-neutral-500">No transcript yet.</p>
        )}

        {hasCaptions && (
          <div className="mt-3">
            <CaptionEditor captions={project.captions} onCaptionChange={updateCaptionLocally} />
          </div>
        )}
      </section>
    </main>
  );
}
