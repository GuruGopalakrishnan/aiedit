import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { STORAGE_DIRS } from "@/lib/config";
import { serializeProject } from "@/lib/serializers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { video: true, transcript: true, captions: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ project: serializeProject(project) });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.status === "string") data.status = body.status;
  if (body.styleSettings) data.styleSettings = JSON.stringify(body.styleSettings);
  if (body.captionSettings) data.captionSettings = JSON.stringify(body.captionSettings);

  try {
    const project = await prisma.project.update({
      where: { id },
      data,
      include: { video: true, transcript: true, captions: true },
    });
    return NextResponse.json({ project: serializeProject(project) });
  } catch {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, include: { video: true, renderJobs: true } });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  if (project.video) {
    await fs.unlink(project.video.originalPath).catch(() => {});
    if (project.video.audioPath) await fs.unlink(project.video.audioPath).catch(() => {});
    if (project.video.thumbnailPath) await fs.unlink(project.video.thumbnailPath).catch(() => {});
  }
  for (const job of project.renderJobs) {
    if (job.outputPath) await fs.unlink(job.outputPath).catch(() => {});
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest, { params }: Params) {
  // Duplicate action: POST /api/projects/:id { action: "duplicate" }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (body.action !== "duplicate") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const source = await prisma.project.findUnique({
    where: { id },
    include: { video: true, transcript: true, captions: true },
  });
  if (!source) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const newId = randomUUID();

  // Copy the underlying files rather than pointing the new project at the
  // source's paths -- otherwise deleting either project (DELETE unlinks by
  // path) would break the other's video/audio/thumbnail.
  const copyFile = async (sourcePath: string | null, dir: string): Promise<string | undefined> => {
    if (!sourcePath) return undefined;
    const destPath = path.join(dir, `${newId}${path.extname(sourcePath)}`);
    await fs.copyFile(sourcePath, destPath);
    return destPath;
  };

  const duplicatedOriginalPath = source.video ? await copyFile(source.video.originalPath, STORAGE_DIRS.uploads) : undefined;
  const duplicatedAudioPath = source.video ? await copyFile(source.video.audioPath, STORAGE_DIRS.audio) : undefined;
  const duplicatedThumbnailPath = source.video ? await copyFile(source.video.thumbnailPath, STORAGE_DIRS.thumbnails) : undefined;

  const duplicated = await prisma.project.create({
    data: {
      id: newId,
      name: `${source.name} (Copy)`,
      status: source.status,
      captionSettings: source.captionSettings,
      styleSettings: source.styleSettings,
      video:
        source.video && duplicatedOriginalPath
          ? {
              create: {
                filename: source.video.filename,
                originalPath: duplicatedOriginalPath,
                audioPath: duplicatedAudioPath,
                duration: source.video.duration,
                width: source.video.width,
                height: source.video.height,
                fileSize: source.video.fileSize,
                thumbnailPath: duplicatedThumbnailPath,
                aspectRatio: source.video.aspectRatio,
              },
            }
          : undefined,
      transcript: source.transcript
        ? { create: { words: source.transcript.words, rawText: source.transcript.rawText, language: source.transcript.language } }
        : undefined,
      captions: {
        create: source.captions.map((c) => ({
          orderIndex: c.orderIndex,
          start: c.start,
          end: c.end,
          text: c.text,
          words: c.words,
          highlightedWords: c.highlightedWords,
          styleOverrides: c.styleOverrides,
        })),
      },
    },
    include: { video: true, transcript: true, captions: true },
  });

  return NextResponse.json({ project: serializeProject(duplicated) }, { status: 201 });
}
