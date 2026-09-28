"use client";

import { useState } from "react";
import type { CaptionGroup } from "@/types";

function CaptionBlock({
  caption,
  onChange,
}: {
  caption: CaptionGroup;
  onChange: (updated: CaptionGroup) => void;
}) {
  const [text, setText] = useState(caption.text);
  const [saving, setSaving] = useState(false);

  const saveText = async () => {
    if (text === caption.text) return;
    setSaving(true);
    const res = await fetch(`/api/captions/${caption.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setSaving(false);
    if (res.ok) onChange({ ...caption, text });
  };

  const toggleHighlight = async (wordId: string) => {
    const next = caption.highlightedWords.includes(wordId)
      ? caption.highlightedWords.filter((id) => id !== wordId)
      : [...caption.highlightedWords, wordId];
    onChange({ ...caption, highlightedWords: next });
    await fetch(`/api/captions/${caption.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlightedWords: next }),
    });
  };

  return (
    <div className="rounded-lg border border-white/10 bg-neutral-900 p-3">
      <p className="text-[11px] text-neutral-500">
        {caption.start.toFixed(2)}s – {caption.end.toFixed(2)}s
      </p>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={saveText}
        className="mt-1 w-full rounded bg-transparent text-sm text-white outline-none focus:bg-white/5"
      />
      <div className="mt-2 flex flex-wrap gap-1">
        {caption.words.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => toggleHighlight(w.id)}
            className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
              caption.highlightedWords.includes(w.id)
                ? "bg-yellow-400 text-black"
                : "bg-white/5 text-neutral-300 hover:bg-white/10"
            }`}
          >
            {w.text}
          </button>
        ))}
      </div>
      {saving && <p className="mt-1 text-[10px] text-neutral-500">Saving…</p>}
    </div>
  );
}

export function CaptionEditor({
  captions,
  onCaptionChange,
}: {
  captions: CaptionGroup[];
  onCaptionChange: (updated: CaptionGroup) => void;
}) {
  return (
    <div className="space-y-2">
      {captions.map((c) => (
        <CaptionBlock key={c.id} caption={c} onChange={onCaptionChange} />
      ))}
    </div>
  );
}
