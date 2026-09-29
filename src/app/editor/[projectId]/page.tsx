"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { CaptionEditor } from "@/components/CaptionEditor";
import { CaptionOverlay } from "@/components/CaptionOverlay";
import { CaptionSettingsPanel } from "@/components/CaptionSettingsPanel";
import { ExportModal } from "@/components/ExportModal";
import { StyleGallery } from "@/components/StyleGallery";
import { Timeline } from "@/components/Timeline";
import { findActiveCaption } from "@/lib/captionStyle";
import { toMediaUrl } from "@/lib/mediaUrl";
import { useDebouncedCallback } from "@/lib/useDebouncedCallback";
import type { CaptionGroup, CaptionPreset, CaptionStyle, Project } from "@/types";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [generatingCaptions, setGeneratingCaptions] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount is intentional; `load` is also reused for manual retry after a transcription error.
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

  const saveStyleSettings = useDebouncedCallback(async (styleSettings: CaptionStyle) => {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ styleSettings }),
    });
  }, 500);

  const handleStyleChange = useCallback(
    (patch: Partial<CaptionStyle>) => {
      setProject((prev) => {
        if (!prev) return prev;
        const nextStyle = { ...prev.styleSettings, ...patch };
        saveStyleSettings(nextStyle);
        return { ...prev, styleSettings: nextStyle };
      });
    },
    [saveStyleSettings]
  );

  const seekTo = useCallback((time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const applyPresetToVideo = useCallback(
    (preset: CaptionPreset) => {
      handleStyleChange(preset.style);
    },
    [handleStyleChange]
  );

  const activeCaptionId = project ? findActiveCaption(project.captions, currentTime)?.id ?? null : null;

  const applyPresetToScene = useCallback(
    async (preset: CaptionPreset) => {
      if (!activeCaptionId) return;
      setProject((prev) =>
        prev
          ? { ...prev, captions: prev.captions.map((c) => (c.id === activeCaptionId ? { ...c, styleOverrides: preset.style } : c)) }
          : prev
      );
      await fetch(`/api/captions/${activeCaptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleOverrides: preset.style }),
      });
    },
    [activeCaptionId]
  );

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
  const activeCaption = hasCaptions ? findActiveCaption(project.captions, currentTime) : null;

  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{project.name}</p>
          <p className="text-xs text-neutral-500">{STATUS_LABEL[project.status]}</p>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          disabled={!hasCaptions}
          className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
        >
          Export Video
        </button>
      </header>

      {showExportModal && <ExportModal projectId={project.id} onClose={() => setShowExportModal(false)} />}

      <div className="flex flex-1 flex-col lg:flex-row">
        <section className="flex flex-1 items-center justify-center bg-black p-6">
          {videoUrl && project.video ? (
            <div
              className="relative max-h-[70vh] w-auto max-w-full"
              style={{ aspectRatio: `${project.video.width} / ${project.video.height}` }}
            >
              <VideoPlayer
                ref={videoRef}
                src={videoUrl}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              />
              {hasCaptions && (
                <CaptionOverlay
                  captions={project.captions}
                  style={project.styleSettings}
                  currentTime={currentTime}
                  showSafeArea={showSafeArea}
                />
              )}
            </div>
          ) : (
            <p className="text-neutral-500">No video attached to this project.</p>
          )}
        </section>

        <aside className="w-full overflow-y-auto border-t border-white/10 bg-neutral-900 p-5 lg:w-80 lg:border-l lg:border-t-0">
          <h2 className="text-sm font-semibold text-neutral-300">Caption Settings</h2>

          {project.video && (
            <div className="mt-2 space-y-0.5 text-xs text-neutral-500">
              <p>
                {formatDuration(project.video.duration)} · {project.video.width}×{project.video.height} (
                {project.video.aspectRatio}) · {(project.video.fileSize / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          )}

          <div className="mt-4">
            <CaptionSettingsPanel
              style={project.styleSettings}
              onChange={handleStyleChange}
              showSafeArea={showSafeArea}
              onToggleSafeArea={() => setShowSafeArea((v) => !v)}
              previewText={activeCaption?.text}
            />
          </div>
        </aside>
      </div>

      {hasCaptions && (
        <section className="border-t border-white/10 bg-neutral-950 p-4">
          <h2 className="text-sm font-semibold text-neutral-300">Style Gallery</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Apply a theme to the whole video, or seek to a scene and apply it just there.
          </p>
          <div className="mt-3">
            <StyleGallery
              sampleWords={activeCaption?.words ?? project.captions[0]?.words}
              activePresetId={project.styleSettings.presetId}
              canApplyToScene={Boolean(activeCaptionId)}
              onApplyToVideo={applyPresetToVideo}
              onApplyToScene={applyPresetToScene}
            />
          </div>
        </section>
      )}

      <section className="border-t border-white/10 bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold text-neutral-300">Timeline</h2>
        {project.video && hasCaptions ? (
          <div className="mt-3">
            <Timeline
              captions={project.captions}
              duration={project.video.duration}
              currentTime={currentTime}
              activeCaptionId={activeCaption?.id ?? null}
              onSeek={seekTo}
            />
          </div>
        ) : (
          <p className="mt-2 text-xs text-neutral-500">Caption blocks will appear here once captions are generated.</p>
        )}
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
