import path from "path";
import { STORAGE_ROOT } from "@/lib/config";

/** Converts an absolute file path inside STORAGE_ROOT into a servable /api/media/... URL. */
export function toMediaUrl(absolutePath?: string | null): string | null {
  if (!absolutePath) return null;
  const relative = path.relative(STORAGE_ROOT, absolutePath).split(path.sep).join("/");
  return `/api/media/${relative}`;
}
