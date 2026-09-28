import path from "path";

export { DEFAULT_EXPORT } from "@/lib/exportDefaults";

export const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(process.cwd(), "storage");

export const STORAGE_DIRS = {
  uploads: path.join(STORAGE_ROOT, "uploads"),
  audio: path.join(STORAGE_ROOT, "audio"),
  renders: path.join(STORAGE_ROOT, "renders"),
  thumbnails: path.join(STORAGE_ROOT, "thumbnails"),
} as const;

export const UPLOAD_LIMITS = {
  maxFileSizeBytes: Number(process.env.MAX_UPLOAD_SIZE_MB || 500) * 1024 * 1024,
  maxDurationSeconds: Number(process.env.MAX_UPLOAD_DURATION_MIN || 10) * 60,
  allowedMimeTypes: ["video/mp4", "video/quicktime", "video/webm"],
  allowedExtensions: [".mp4", ".mov", ".webm"],
} as const;

export const CAPTION_CHUNKING_DEFAULTS: Record<
  "short" | "medium" | "long",
  { min: number; max: number }
> = {
  short: { min: 2, max: 4 },
  medium: { min: 4, max: 7 },
  long: { min: 6, max: 10 },
};

