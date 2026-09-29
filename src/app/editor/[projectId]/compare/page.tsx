"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CaptionOverlay } from "@/components/CaptionOverlay";
import { CAPTION_PRESETS } from "@/lib/presets";
import { toMediaUrl } from "@/lib/mediaUrl";
import type { Project } from "@/types";

const SLOT_COUNT = 4;
const RESYNC_THRESHOLD = 0.15;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ComparePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [presetIds, setPresetIds] = useState<string[]>(CAPTION_PRESETS.slice(0, SLOT_COUNT).map((p) => p.id));
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>(Array(SLOT_COUNT).fill(null));

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setProject(d.project);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load project."));
  }, [projectId]);

  const togglePlay = useCallback(() => {
    if (playing) {
      videoRefs.current.forEach((v) => v?.pause());
      setPlaying(false);
    } else {
      videoRefs.current.forEach((v) => v?.play().catch(() => {}));
      setPlaying(true);
    }
  }, [playing]);

  const seekAll = useCallback((t: number) => {
    videoRefs.current.forEach((v) => {
      if (v) v.currentTime = t;
    });
    setCurrentTime(t);
  }, []);

  // Slots 1-3 drift slightly from independent playback; periodically pull them
  // back to slot 0's time so captions across the grid stay visibly in sync.
  useEffect(() => {
    const id = setInterval(() => {
      const master = videoRefs.current[0];
      if (!master) return;
      videoRefs.current.forEach((v, i) => {
        if (i === 0 || !v) return;
        if (Math.abs(v.currentTime - master.currentTime) > RESYNC_THRESHOLD) v.currentTime = master.currentTime;
      });
    }, 800);
    return () => clearInterval(id);
  }, []);

  if (error) {
    return <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-red-400">{error}</main>;
  }
  if (!project) {
    return <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">Loading…</main>;
  }

  const videoUrl = toMediaUrl(project.video?.originalPath);
  const duration = project.video?.duration ?? 0;
  const hasCaptions = project.captions.length > 0;

  return (
    <main className="min-h-screen bg-neutral-950 p-4 text-white sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={`/editor/${projectId}`} className="text-xs text-neutral-500 hover:text-neutral-300">
              ← Back to editor
            </Link>
            <h1 className="mt-1 text-xl font-semibold sm:text-2xl">Compare Styles</h1>
            <p className="mt-1 text-xs text-neutral-500">Same video, four themes side by side — pick one per slot.</p>
          </div>
          <button onClick={togglePlay} disabled={!videoUrl} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-40">
            {playing ? "Pause" : "Play"}
          </button>
        </div>

        {videoUrl && duration > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <span className="w-10 shrink-0 text-right font-mono text-xs text-neutral-400">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.05}
              value={currentTime}
              onChange={(e) => seekAll(Number(e.target.value))}
              className="w-full"
            />
            <span className="w-10 shrink-0 font-mono text-xs text-neutral-400">{formatTime(duration)}</span>
          </div>
        )}

        {!hasCaptions && (
          <p className="mt-6 text-sm text-neutral-500">This project has no captions yet — generate captions in the editor first.</p>
        )}

        {videoUrl && hasCaptions && (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: SLOT_COUNT }).map((_, i) => {
              const preset = CAPTION_PRESETS.find((p) => p.id === presetIds[i]) ?? CAPTION_PRESETS[0];
              return (
                <div key={i} className="rounded-xl border border-white/10 bg-neutral-900 p-2.5">
                  <select
                    value={preset.id}
                    onChange={(e) => setPresetIds((prev) => prev.map((id, idx) => (idx === i ? e.target.value : id)))}
                    className="mb-2 w-full rounded border border-white/10 bg-neutral-800 px-2 py-1.5 text-xs text-white"
                  >
                    {CAPTION_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-black">
                    <video
                      ref={(el) => {
                        videoRefs.current[i] = el;
                      }}
                      src={videoUrl}
                      muted
                      loop
                      playsInline
                      className="h-full w-full object-cover"
                      onTimeUpdate={i === 0 ? (e) => setCurrentTime(e.currentTarget.currentTime) : undefined}
                    />
                    <CaptionOverlay captions={project.captions} style={preset.style} currentTime={currentTime} showSafeArea={false} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
