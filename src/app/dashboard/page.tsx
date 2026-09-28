"use client";

import { useEffect, useState } from "react";
import { ProjectCard } from "@/components/ProjectCard";
import { VideoUploader } from "@/components/VideoUploader";
import type { Project } from "@/types";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load projects.");
      setProjects(data.projects);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDuplicate = async (id: string) => {
    await fetch(`/api/projects/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "duplicate" }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <main className="min-h-screen bg-neutral-950 px-8 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Your Projects</h1>
          <button
            onClick={() => setShowUploader((v) => !v)}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
          >
            + New Project
          </button>
        </div>

        {showUploader && (
          <div className="mt-6">
            <VideoUploader />
          </div>
        )}

        {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

        {projects === null && !error && (
          <p className="mt-10 text-sm text-neutral-400">Loading projects…</p>
        )}

        {projects && projects.length === 0 && (
          <div className="mt-16 text-center text-neutral-400">
            <p>No projects yet.</p>
            <p className="mt-1 text-sm">Upload a talking-head video to get started.</p>
          </div>
        )}

        {projects && projects.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} onDuplicate={handleDuplicate} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
