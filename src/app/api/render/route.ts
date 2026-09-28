import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toMediaUrl } from "@/lib/mediaUrl";
import { renderProject } from "@/services/render/renderProject";
import type { CaptionGroup, CaptionStyle, RenderQuality } from "@/types";

const VALID_QUALITIES: RenderQuality[] = ["draft", "standard", "high"];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const projectId = body.projectId as string | undefined;
  const quality: RenderQuality = VALID_QUALITIES.includes(body.quality) ? body.quality : "standard";

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { video: true, captions: { orderBy: { orderIndex: "asc" } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (!project.video) {
    return NextResponse.json({ error: "This project has no video to render." }, { status: 400 });
  }
  if (project.captions.length === 0) {
    return NextResponse.json({ error: "This project has no captions yet. Generate captions first." }, { status: 400 });
  }

  const videoMediaPath = toMediaUrl(project.video.originalPath);
  if (!videoMediaPath) {
    return NextResponse.json({ error: "Could not resolve the project video's location." }, { status: 500 });
  }
  const videoUrl = new URL(videoMediaPath, request.nextUrl.origin).toString();

  const job = await prisma.renderJob.create({
    data: { projectId, status: "QUEUED", progress: 0, quality },
  });

  const captions: CaptionGroup[] = project.captions.map((c) => ({
    id: c.id,
    start: c.start,
    end: c.end,
    text: c.text,
    words: JSON.parse(c.words),
    highlightedWords: JSON.parse(c.highlightedWords),
  }));
  const style: CaptionStyle = JSON.parse(project.styleSettings);

  // Fire-and-forget: the client polls GET /api/render/:jobId for progress rather than
  // blocking this request on what can be a render lasting well beyond an HTTP timeout.
  void runRenderJob(job.id, {
    videoUrl,
    durationInSeconds: project.video.duration,
    width: project.video.width,
    height: project.video.height,
    fps: 30,
    captions,
    style,
    quality,
  });

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}

async function runRenderJob(
  jobId: string,
  params: Omit<Parameters<typeof renderProject>[0], "jobId" | "onProgress">
) {
  await prisma.renderJob.update({ where: { id: jobId }, data: { status: "PROCESSING" } });

  try {
    const outputPath = await renderProject({
      ...params,
      jobId,
      onProgress: (progress) => {
        prisma.renderJob.update({ where: { id: jobId }, data: { progress } }).catch(() => {});
      },
    });

    await prisma.renderJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", progress: 100, outputPath },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Render failed unexpectedly.";
    await prisma.renderJob.update({ where: { id: jobId }, data: { status: "FAILED", error: message } });
  }
}
