"use client";

import Link from "next/link";
import { toMediaUrl } from "@/lib/mediaUrl";
import type { Project } from "@/types";

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const STATUS_LABEL: Record<Project["status"], string> = {
  draft: "Draft",
  transcribing: "Transcribing",
  ready: "Ready",
  rendering: "Rendering",
  rendered: "Rendered",
  failed: "Failed",
};

export function ProjectCard({
  project,
  onDuplicate,
  onDelete,
}: {
  project: Project;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const thumbUrl = toMediaUrl(project.video?.thumbnailPath);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-neutral-900 transition-colors hover:border-white/20">
      <Link href={`/editor/${project.id}`} className="block">
        <div className="relative aspect-[9/16] w-full bg-neutral-800">
          {thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl} alt={project.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-600">
              No preview
            </div>
          )}
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {STATUS_LABEL[project.status]}
          </span>
        </div>
        <div className="p-3">
          <p className="truncate text-sm font-medium text-white">{project.name}</p>
          <p className="mt-1 text-xs text-neutral-400">
            {project.video ? formatDuration(project.video.duration) : "--:--"} ·{" "}
            {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2 text-xs">
        <button
          onClick={() => onDuplicate(project.id)}
          className="rounded px-2 py-1 text-neutral-400 hover:bg-white/10 hover:text-white"
        >
          Duplicate
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="rounded px-2 py-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
