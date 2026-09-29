"use client";

import { useEffect, useMemo, useState } from "react";
import { CaptionOverlay } from "@/components/CaptionOverlay";
import { CAPTION_PRESETS } from "@/lib/presets";
import type { CaptionGroup, CaptionPreset, CaptionThemeCategory, TranscriptWord } from "@/types";

const CYCLE_MS = 2400;
const DEMO_TEXT = ["Create", "better", "ads", "in", "minutes"];

const CATEGORIES: { value: CaptionThemeCategory | "all" | "favorites"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "favorites", label: "★ Favorites" },
  { value: "custom", label: "My Presets" },
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
  isFavorite,
  isCustom,
  onApplyToVideo,
  onApplyToScene,
  onToggleFavorite,
  onDelete,
  canApplyToScene,
}: {
  preset: CaptionPreset;
  sampleWords: TranscriptWord[] | undefined;
  previewTime: number;
  isFavorite: boolean;
  isCustom: boolean;
  onApplyToVideo: () => void;
  onApplyToScene: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  canApplyToScene: boolean;
}) {
  const sample = useMemo(() => buildSampleCaption(sampleWords), [sampleWords]);

  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900 p-2.5">
      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg bg-black">
        <CaptionOverlay captions={[sample]} style={preset.style} currentTime={previewTime} showSafeArea={false} />
        <button
          onClick={onToggleFavorite}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          className="absolute right-1.5 top-1.5 rounded-full bg-black/50 px-1.5 py-1 text-sm leading-none"
        >
          {isFavorite ? "★" : "☆"}
        </button>
        {isCustom && (
          <button
            onClick={onDelete}
            title="Delete this preset"
            className="absolute left-1.5 top-1.5 rounded-full bg-black/50 px-1.5 py-1 text-[10px] leading-none text-red-300"
          >
            ✕
          </button>
        )}
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

type CustomPresetRecord = { id: string; name: string; style: CaptionPreset["style"]; createdAt: string };

export function StyleGallery({
  sampleWords,
  currentStyle,
  canApplyToScene,
  onApplyToVideo,
  onApplyToScene,
}: {
  sampleWords: TranscriptWord[] | undefined;
  currentStyle: CaptionPreset["style"];
  canApplyToScene: boolean;
  onApplyToVideo: (preset: CaptionPreset) => void;
  onApplyToScene: (preset: CaptionPreset) => void;
}) {
  const [category, setCategory] = useState<CaptionThemeCategory | "all" | "favorites">("all");
  const [previewTime, setPreviewTime] = useState(0);
  const [customPresets, setCustomPresets] = useState<CustomPresetRecord[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadExtras = () => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then((d) => setCustomPresets(d.presets ?? []))
      .catch(() => {});
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d) => setFavoriteIds(d.presetIds ?? []))
      .catch(() => {});
  };

  useEffect(() => {
    loadExtras();
  }, []);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setPreviewTime(((Date.now() - start) % CYCLE_MS) / 1000);
    }, 50);
    return () => clearInterval(id);
  }, []);

  const allPresets: CaptionPreset[] = useMemo(() => {
    const custom: CaptionPreset[] = customPresets.map((p) => ({
      id: p.id,
      name: p.name,
      description: "Saved preset",
      category: "custom",
      style: p.style,
    }));
    return [...CAPTION_PRESETS, ...custom];
  }, [customPresets]);

  const filtered = allPresets.filter((p) => {
    if (category === "all") return true;
    if (category === "favorites") return favoriteIds.includes(p.id);
    return p.category === category;
  });

  const toggleFavorite = async (presetId: string) => {
    const isFav = favoriteIds.includes(presetId);
    setFavoriteIds((prev) => (isFav ? prev.filter((id) => id !== presetId) : [...prev, presetId]));
    if (isFav) {
      await fetch("/api/favorites", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ presetId }) });
    } else {
      await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ presetId }) });
    }
  };

  const deleteCustom = async (presetId: string) => {
    setCustomPresets((prev) => prev.filter((p) => p.id !== presetId));
    setFavoriteIds((prev) => prev.filter((id) => id !== presetId));
    await fetch(`/api/presets/${presetId}`, { method: "DELETE" });
  };

  const saveCurrent = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveName.trim(), style: currentStyle }),
      });
      const data = await res.json();
      if (res.ok) {
        setCustomPresets((prev) => [data.preset, ...prev]);
        setSaveName("");
        setCategory("custom");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
        <input
          type="text"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          placeholder="Name your current style (e.g. Guru Style 01)"
          className="min-w-0 flex-1 rounded border border-white/10 bg-neutral-800 px-2 py-1.5 text-xs text-white placeholder:text-neutral-600"
        />
        <button
          onClick={saveCurrent}
          disabled={saving || !saveName.trim()}
          className="shrink-0 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save as My Preset"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
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
            isFavorite={favoriteIds.includes(preset.id)}
            isCustom={preset.category === "custom"}
            canApplyToScene={canApplyToScene}
            onApplyToVideo={() => onApplyToVideo(preset)}
            onApplyToScene={() => onApplyToScene(preset)}
            onToggleFavorite={() => toggleFavorite(preset.id)}
            onDelete={() => deleteCustom(preset.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-xs text-neutral-500">Nothing here yet.</p>
        )}
      </div>
    </div>
  );
}
