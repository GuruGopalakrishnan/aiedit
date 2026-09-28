"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
import { toMediaUrl } from "@/lib/mediaUrl";
import type { Project } from "@/types";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load project.");
        setProject(data.project);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load project."));
  }, [projectId]);

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

  return (
    <main className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div>
          <p className="text-sm font-medium">{project.name}</p>
          <p className="text-xs text-neutral-500">
            {saveStatus === "saved" ? "Saved" : "All changes saved"}
          </p>
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
            Presets, fonts, colors, positioning, and animations will appear here once transcription
            (Phase 2) and the caption engine (Phase 3) are wired up.
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
          Caption blocks will appear here after transcription runs.
        </p>
      </section>

      <section className="border-t border-white/10 bg-neutral-950 p-4">
        <h2 className="text-sm font-semibold text-neutral-300">Transcript</h2>
        <p className="mt-2 text-xs text-neutral-500">No transcript yet.</p>
      </section>
    </main>
  );
}
