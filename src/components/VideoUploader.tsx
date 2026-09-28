"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ACCEPTED = [".mp4", ".mov", ".webm"];

export function VideoUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED.includes(ext)) {
        setError(`Unsupported file type "${ext}". Please upload MP4, MOV, or WEBM.`);
        return;
      }

      setUploading(true);
      setProgressLabel("Uploading video…");

      const formData = new FormData();
      formData.append("video", file);
      formData.append("name", file.name.replace(/\.[^.]+$/, ""));

      try {
        const res = await fetch("/api/projects", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Upload failed.");
        }

        const projectId = data.project.id as string;

        setProgressLabel("Transcribing speech…");
        const transcribeRes = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        if (!transcribeRes.ok) {
          // Non-fatal: land in the editor so the user can retry transcription there.
          console.error("Transcription failed:", (await transcribeRes.json()).error);
        }

        setProgressLabel("Opening editor…");
        router.push(`/editor/${projectId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed unexpectedly.");
        setUploading(false);
        setProgressLabel(null);
      }
    },
    [router]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) upload(file);
    },
    [upload]
  );

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
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
          <p className="text-sm text-neutral-300">{progressLabel}</p>
        ) : (
          <>
            <p className="text-base font-medium text-white">Drop a talking-head video here</p>
            <p className="mt-1 text-sm text-neutral-400">or click to browse — MP4, MOV, WEBM (max 500MB, 10 min)</p>
          </>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
