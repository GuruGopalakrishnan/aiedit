"use client";

import { useEffect, useMemo, useState } from "react";
import { CaptionOverlay } from "@/components/CaptionOverlay";
import { CAPTION_PRESETS } from "@/lib/presets";
import type { CaptionGroup, CaptionPreset, CaptionThemeCategory, TranscriptWord } from "@/types";

const CYCLE_MS = 2400;
const DEMO_TEXT = ["Create", "better", "ads", "in", "minutes"];

const CATEGORIES: { value: CaptionThemeCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
  { value: "kinetic", label: "Kinetic" },
  { value: "editorial", label: "Editorial" },
  { value: "business", label: "Business" },
  { value: "creator", label: "Creator" },
  { value: "tamil", label: "Tamil" },
];

function buildSampleCaption(sourceWords: TranscriptWord[] | undefined): CaptionGroup {
  const words: TranscriptWord[] =
    sourceWords && sourceWords.length > 0
      ? sourceWords.slice(0, 5)
      : DEMO_TEXT.map((text, i) => ({ id: `demo-${i}`, text, start: 0, end: 0 }));

  const span = CYCLE_MS / 1000 - 0.3;
  const per = span / words.length;
  const timedWords = words.map((w, i) => ({ ...w, id: `preview-${i}`, start: 0.15 + i * per, end: 0.15 + (i + 1) * per - 0.03 }));

  return {
    id: "preview",
    start: 0,
    end: CYCLE_MS / 1000,
    text: timedWords.map((w) => w.text).join(" "),
    words: timedWords,
    highlightedWords: timedWords.length > 1 ? [timedWords[Math.floor(timedWords.length / 2)].id] : [],
    styleOverrides: {},
  };
}

function ThemeCard({
  preset,
  sampleWords,
  previewTime,
  onApplyToVideo,
  onApplyToScene,
  canApplyToScene,
}: {
  preset: CaptionPreset;
  sampleWords: TranscriptWord[] | undefined;
  previewTime: number;
  onApplyToVideo: () => void;
  onApplyToScene: () => void;
  canApplyToScene: boolean;
}) {
  const sample = useMemo(() => buildSampleCaption(sampleWords), [sampleWords]);

  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900 p-2.5">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-black">
        <CaptionOverlay captions={[sample]} style={preset.style} currentTime={previewTime} showSafeArea={false} />
      </div>
      <p className="mt-2 truncate text-xs font-medium text-white">{preset.name}</p>
      <p className="truncate text-[10px] text-neutral-500">{preset.description}</p>
      <div className="mt-2 flex gap-1.5">
        <button
          onClick={onApplyToVideo}
          className="flex-1 rounded-md border border-white/15 px-2 py-1 text-[10px] font-medium text-white hover:bg-white/10"
        >
          Whole Video
        </button>
        <button
          onClick={onApplyToScene}
          disabled={!canApplyToScene}
          title={canApplyToScene ? "Apply to the scene at the playhead" : "Seek to a caption to enable"}
          className="flex-1 rounded-md border border-white/15 px-2 py-1 text-[10px] font-medium text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
        >
          This Scene
        </button>
      </div>
    </div>
  );
}

export function StyleGallery({
  sampleWords,
  activePresetId,
  canApplyToScene,
  onApplyToVideo,
  onApplyToScene,
}: {
  sampleWords: TranscriptWord[] | undefined;
  activePresetId?: string;
  canApplyToScene: boolean;
  onApplyToVideo: (preset: CaptionPreset) => void;
  onApplyToScene: (preset: CaptionPreset) => void;
}) {
  const [category, setCategory] = useState<CaptionThemeCategory | "all">("all");
  const [previewTime, setPreviewTime] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setPreviewTime(((Date.now() - start) % CYCLE_MS) / 1000);
    }, 50);
    return () => clearInterval(id);
  }, []);

  const filtered = category === "all" ? CAPTION_PRESETS : CAPTION_PRESETS.filter((p) => p.category === category);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${
              category === c.value ? "border-white bg-white text-black" : "border-white/15 text-neutral-300 hover:border-white/40"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((preset) => (
          <ThemeCard
            key={preset.id}
            preset={preset}
            sampleWords={sampleWords}
            previewTime={previewTime}
            canApplyToScene={canApplyToScene}
            onApplyToVideo={() => onApplyToVideo(preset)}
            onApplyToScene={() => onApplyToScene(preset)}
          />
        ))}
      </div>
      {activePresetId && (
        <p className="mt-2 text-[10px] text-neutral-500">Current whole-video theme: {activePresetId}</p>
      )}
    </div>
  );
}
