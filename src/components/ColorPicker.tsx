"use client";

export function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-xs text-neutral-400">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-8 cursor-pointer rounded border border-white/20 bg-transparent"
        />
        <span className="w-16 font-mono text-[11px] text-neutral-400">{value.toUpperCase()}</span>
      </span>
    </label>
  );
}
