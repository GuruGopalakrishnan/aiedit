import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { STORAGE_ROOT } from "@/lib/config";

const MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".wav": "audio/wav",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

type Params = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { path: segments } = await params;

  // Resolve and confirm the path stays within STORAGE_ROOT (prevents path traversal).
  const requested = path.resolve(STORAGE_ROOT, ...segments);
  if (!requested.startsWith(path.resolve(STORAGE_ROOT))) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  if (!fs.existsSync(requested)) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const stat = fs.statSync(requested);
  const ext = path.extname(requested).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const contentDisposition = request.nextUrl.searchParams.has("download")
    ? `attachment; filename="${path.basename(requested)}"`
    : undefined;

  const range = request.headers.get("range");
  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(requested, { start, end });
    const body = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });
    return new NextResponse(body, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": contentType,
        ...(contentDisposition ? { "Content-Disposition": contentDisposition } : {}),
      },
    });
  }

  const stream = fs.createReadStream(requested);
  const body = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Accept-Ranges": "bytes",
      ...(contentDisposition ? { "Content-Disposition": contentDisposition } : {}),
    },
  });
}
