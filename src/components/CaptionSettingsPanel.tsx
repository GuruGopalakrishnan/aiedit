"use client";

import { ColorPicker } from "@/components/ColorPicker";
import { FontPicker } from "@/components/FontPicker";
import { CAPTION_PRESETS } from "@/lib/presets";
import type {
  BackgroundStyle,
  CaptionAnimation,
  CaptionDecoration,
  CaptionLayout,
  CaptionPosition,
  CaptionStyle,
  FontWeight,
  StrokeWidth,
  TextAlign,
  TextCase,
} from "@/types";

const FONT_WEIGHTS: FontWeight[] = ["regular", "medium", "semibold", "bold", "extrabold"];
const DECORATIONS: { value: CaptionDecoration; label: string }[] = [
  { value: "none", label: "None" },
  { value: "marker", label: "Marker" },
  { value: "underline", label: "Underline" },
  { value: "gradient", label: "Gradient" },
];
const LAYOUTS: { value: CaptionLayout; label: string; hint: string }[] = [
  { value: "inline", label: "Inline", hint: "One block, all words together" },
  { value: "stacked", label: "Stacked", hint: "Short lines, emphasis gets its own line" },
  { value: "single-word", label: "Word Pop", hint: "One word at a time, synced to speech" },
];
const STROKES: StrokeWidth[] = ["none", "thin", "medium", "thick"];
const BACKGROUNDS: BackgroundStyle[] = ["none", "solid", "semi-transparent"];
const TEXT_CASES: TextCase[] = ["original", "uppercase", "lowercase", "titlecase"];
const TEXT_ALIGNS: TextAlign[] = ["left", "center", "right"];
const ANIMATIONS: { value: CaptionAnimation; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "pop", label: "Pop" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-left", label: "Slide Left" },
  { value: "bounce", label: "Bounce" },
  { value: "scale", label: "Scale" },
  { value: "word-highlight", label: "Word Highlight" },
];

const POSITION_GRID: (CaptionPosition | null)[] = [
  "top-left", "top-center", "top-right",
  null, "center", null,
  "bottom-left", "bottom-center", "bottom-right",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/10 pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

export function CaptionSettingsPanel({
  style,
  onChange,
  showSafeArea,
  onToggleSafeArea,
  previewText,
}: {
  style: CaptionStyle;
  onChange: (patch: Partial<CaptionStyle>) => void;
  showSafeArea: boolean;
  onToggleSafeArea: () => void;
  previewText?: string;
}) {
  return (
    <div className="space-y-4">
      <Section title="Preset">
        <div className="grid grid-cols-1 gap-1.5">
          {CAPTION_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => onChange(p.style)}
              className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors ${
                style.presetId === p.id
                  ? "border-white bg-white/10 text-white"
                  : "border-white/10 text-neutral-300 hover:border-white/30"
              }`}
            >
              <p className="font-medium">{p.name}</p>
              <p className="text-[10px] text-neutral-500">{p.description}</p>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Font">
        <FontPicker value={style.fontFamily} previewText={previewText ?? ""} onChange={(fontFamily) => onChange({ fontFamily })} />
        <select
          value={style.fontWeight}
          onChange={(e) => onChange({ fontWeight: e.target.value as FontWeight })}
          className="w-full rounded border border-white/10 bg-neutral-800 px-2 py-1 text-xs text-white"
        >
          {FONT_WEIGHTS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-neutral-400">
          Size
          <input
            type="range"
            min={32}
            max={140}
            value={style.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="w-8 text-right font-mono">{style.fontSize}</span>
        </label>
      </Section>

      <Section title="Layout">
        <div className="space-y-1.5">
          {LAYOUTS.map((l) => (
            <button
              key={l.value}
              onClick={() => onChange({ layout: l.value })}
              className={`w-full rounded-lg border px-2.5 py-1.5 text-left text-xs ${
                style.layout === l.value ? "border-white bg-white/10 text-white" : "border-white/10 text-neutral-300 hover:border-white/30"
              }`}
            >
              <p className="font-medium">{l.label}</p>
              <p className="text-[10px] text-neutral-500">{l.hint}</p>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Animation">
        <div className="grid grid-cols-2 gap-1.5">
          {ANIMATIONS.map((a) => (
            <button
              key={a.value}
              onClick={() => onChange({ animation: a.value })}
              className={`rounded border px-2 py-1 text-xs ${
                style.animation === a.value
                  ? "border-white bg-white/10 text-white"
                  : "border-white/10 text-neutral-400"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Alignment">
        <div className="flex gap-1.5">
          {TEXT_ALIGNS.map((a) => (
            <button
              key={a}
              onClick={() => onChange({ textAlign: a })}
              className={`flex-1 rounded border px-2 py-1 text-xs capitalize ${
                style.textAlign === a ? "border-white bg-white/10 text-white" : "border-white/10 text-neutral-400"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Position">
        <div className="grid grid-cols-3 gap-1.5">
          {POSITION_GRID.map((pos, i) =>
            pos ? (
              <button
                key={pos}
                onClick={() => onChange({ position: pos })}
                className={`aspect-square rounded border ${
                  style.position === pos ? "border-white bg-white/20" : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
                aria-label={pos}
              />
            ) : (
              <div key={`empty-${i}`} />
            )
          )}
        </div>
      </Section>

      <Section title="Colors">
        <ColorPicker label="Text" value={style.textColor} onChange={(v) => onChange({ textColor: v })} />
        <ColorPicker label="Highlight" value={style.highlightColor} onChange={(v) => onChange({ highlightColor: v })} />
      </Section>

      <Section title="Stroke">
        <div className="flex gap-1.5">
          {STROKES.map((s) => (
            <button
              key={s}
              onClick={() => onChange({ stroke: s })}
              className={`flex-1 rounded border px-2 py-1 text-xs capitalize ${
                style.stroke === s ? "border-white bg-white/10 text-white" : "border-white/10 text-neutral-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Background">
        <div className="flex gap-1.5">
          {BACKGROUNDS.map((b) => (
            <button
              key={b}
              onClick={() => onChange({ background: b })}
              className={`flex-1 rounded border px-2 py-1 text-[11px] capitalize ${
                style.background === b ? "border-white bg-white/10 text-white" : "border-white/10 text-neutral-400"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Decoration">
        <div className="flex gap-1.5">
          {DECORATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => onChange({ decoration: d.value })}
              className={`flex-1 rounded border px-2 py-1 text-[11px] ${
                style.decoration === d.value ? "border-white bg-white/10 text-white" : "border-white/10 text-neutral-400"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Text Case">
        <select
          value={style.textCase}
          onChange={(e) => onChange({ textCase: e.target.value as TextCase })}
          className="w-full rounded border border-white/10 bg-neutral-800 px-2 py-1 text-xs text-white"
        >
          {TEXT_CASES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Section>

      <Section title="Toggles">
        <label className="flex items-center justify-between text-xs text-neutral-400">
          Shadow
          <input
            type="checkbox"
            checked={style.shadow}
            onChange={(e) => onChange({ shadow: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between text-xs text-neutral-400">
          Active word highlight
          <input
            type="checkbox"
            checked={style.wordHighlightEnabled}
            onChange={(e) => onChange({ wordHighlightEnabled: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between text-xs text-neutral-400">
          Safe area guide
          <input type="checkbox" checked={showSafeArea} onChange={onToggleSafeArea} />
        </label>
      </Section>
    </div>
  );
}
