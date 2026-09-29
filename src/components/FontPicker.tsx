"use client";

import { useMemo, useState } from "react";
import { FONT_LIBRARY, type FontCategory } from "@/lib/fonts";

const CATEGORIES: { value: FontCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bold", label: "Bold" },
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
  { value: "editorial", label: "Editorial" },
  { value: "condensed", label: "Condensed" },
  { value: "serif", label: "Serif" },
  { value: "display", label: "Display" },
  { value: "playful", label: "Playful" },
  { value: "tamil", label: "Tamil" },
];

export function FontPicker({
  value,
  previewText,
  onChange,
}: {
  value: string;
  previewText: string;
  onChange: (fontFamily: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FontCategory | "all">("all");

  const filtered = useMemo(() => {
    return FONT_LIBRARY.filter((f) => {
      const matchesQuery = query.trim() === "" || f.name.toLowerCase().includes(query.trim().toLowerCase());
      const matchesCategory = category === "all" || f.categories.includes(category);
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search fonts…"
        className="w-full rounded border border-white/10 bg-neutral-800 px-2 py-1.5 text-xs text-white placeholder:text-neutral-600"
      />
      <div className="mt-1.5 flex flex-wrap gap-1">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`rounded-full border px-2 py-0.5 text-[10px] ${
              category === c.value ? "border-white bg-white text-black" : "border-white/15 text-neutral-400 hover:border-white/40"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
        {filtered.map((f) => (
          <button
            key={f.fontFamily}
            onClick={() => onChange(f.fontFamily)}
            className={`block w-full rounded-lg border px-2.5 py-1.5 text-left ${
              value === f.fontFamily ? "border-white bg-white/10" : "border-white/10 hover:border-white/30"
            }`}
          >
            <p className="truncate text-base leading-tight text-white" style={{ fontFamily: f.fontFamily }}>
              {previewText || f.name}
            </p>
            <p className="mt-0.5 text-[10px] text-neutral-500">
              {f.name}
              {f.supportsTamil ? " · Tamil" : ""}
            </p>
          </button>
        ))}
        {filtered.length === 0 && <p className="py-2 text-center text-xs text-neutral-500">No fonts match.</p>}
      </div>
    </div>
  );
}
