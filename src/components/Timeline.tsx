"use client";

import type { CaptionGroup } from "@/types";

export function Timeline({
  captions,
  duration,
  currentTime,
  activeCaptionId,
  onSeek,
}: {
  captions: CaptionGroup[];
  duration: number;
  currentTime: number;
  activeCaptionId: string | null;
  onSeek: (time: number) => void;
}) {
  if (duration <= 0) return null;

  return (
    <div
      className="relative h-12 w-full cursor-pointer rounded-md bg-neutral-800"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        onSeek(Math.max(0, Math.min(duration, ratio * duration)));
      }}
    >
      {captions.map((c) => (
        <button
          key={c.id}
          type="button"
          title={c.text}
          onClick={(e) => {
            e.stopPropagation();
            onSeek(c.start);
          }}
          className={`absolute top-1 bottom-1 overflow-hidden rounded px-1 text-left text-[10px] leading-4 text-white transition-colors ${
            activeCaptionId === c.id ? "bg-white/40" : "bg-white/15 hover:bg-white/25"
          }`}
          style={{
            left: `${(c.start / duration) * 100}%`,
            width: `${Math.max(0.5, ((c.end - c.start) / duration) * 100)}%`,
          }}
        >
          <span className="truncate">{c.text}</span>
        </button>
      ))}

      <div
        className="pointer-events-none absolute top-0 bottom-0 w-px bg-red-500"
        style={{ left: `${(currentTime / duration) * 100}%` }}
      />
    </div>
  );
}
