import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { STORAGE_DIRS, UPLOAD_LIMITS } from "@/lib/config";
import { DEFAULT_CAPTION_SETTINGS, DEFAULT_CAPTION_STYLE } from "@/lib/presets";
import { extractAudio, generateThumbnail, probeVideo, resolveAspectRatio } from "@/services/video/metadata";
import { serializeProject } from "@/lib/serializers";

export async function GET() {
  const projects = await prisma.project.findMany({
    include: { video: true, transcript: true, captions: true },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ projects: projects.map(serializeProject) });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("video");
  const name = (formData.get("name") as string | null) || "Untitled Project";

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No video file was provided." }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!UPLOAD_LIMITS.allowedExtensions.includes(ext as never)) {
    return NextResponse.json(
      { error: `Unsupported file type "${ext}". Allowed: ${UPLOAD_LIMITS.allowedExtensions.join(", ")}` },
      { status: 400 }
    );
  }

  if (file.size > UPLOAD_LIMITS.maxFileSizeBytes) {
    return NextResponse.json(
      { error: `File is too large. Maximum size is ${UPLOAD_LIMITS.maxFileSizeBytes / (1024 * 1024)}MB.` },
      { status: 400 }
    );
  }

  const projectId = randomUUID();
  const storedFilename = `${projectId}${ext}`;
  const storedPath = path.join(STORAGE_DIRS.uploads, storedFilename);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.mkdir(STORAGE_DIRS.uploads, { recursive: true });
    await fs.writeFile(storedPath, buffer);
  } catch {
    return NextResponse.json({ error: "Failed to save the uploaded file to storage." }, { status: 500 });
  }

  let meta;
  try {
    meta = await probeVideo(storedPath);
  } catch (e) {
    await fs.unlink(storedPath).catch(() => {});
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to read video metadata." },
      { status: 422 }
    );
  }

  if (meta.duration > UPLOAD_LIMITS.maxDurationSeconds) {
    await fs.unlink(storedPath).catch(() => {});
    return NextResponse.json(
      { error: `Video is too long. Maximum duration is ${UPLOAD_LIMITS.maxDurationSeconds / 60} minutes.` },
      { status: 400 }
    );
  }

  let thumbnailPath: string | undefined;
  try {
    thumbnailPath = await generateThumbnail(storedPath, projectId);
  } catch {
    thumbnailPath = undefined;
  }

  let audioPath: string | undefined;
  try {
    audioPath = await extractAudio(storedPath, projectId);
  } catch {
    audioPath = undefined;
  }

  const project = await prisma.project.create({
    data: {
      id: projectId,
      name,
      status: "draft",
      captionSettings: JSON.stringify(DEFAULT_CAPTION_SETTINGS),
      styleSettings: JSON.stringify(DEFAULT_CAPTION_STYLE),
      video: {
        create: {
          filename: file.name,
          originalPath: storedPath,
          audioPath,
          duration: meta.duration,
          width: meta.width,
          height: meta.height,
          fileSize: meta.fileSize,
          thumbnailPath,
          aspectRatio: resolveAspectRatio(meta.width, meta.height),
        },
      },
    },
    include: { video: true, transcript: true, captions: true },
  });

  return NextResponse.json({ project: serializeProject(project) }, { status: 201 });
}
