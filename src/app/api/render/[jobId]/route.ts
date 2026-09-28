import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toMediaUrl } from "@/lib/mediaUrl";
import type { RenderJob } from "@/types";

type Params = { params: Promise<{ jobId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { jobId } = await params;
  const job = await prisma.renderJob.findUnique({ where: { id: jobId } });

  if (!job) {
    return NextResponse.json({ error: "Render job not found." }, { status: 404 });
  }

  const serialized: RenderJob & { downloadUrl: string | null } = {
    id: job.id,
    projectId: job.projectId,
    status: job.status as RenderJob["status"],
    progress: job.progress,
    quality: job.quality as RenderJob["quality"],
    outputPath: job.outputPath ?? undefined,
    error: job.error ?? undefined,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    downloadUrl: job.outputPath ? toMediaUrl(job.outputPath) : null,
  };

  return NextResponse.json({ job: serialized });
}
