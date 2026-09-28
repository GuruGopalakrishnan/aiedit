import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serializers";
import { getCaptionIntelligenceProvider } from "@/services/captions";
import type { CaptionGroup, CaptionSettings, TranscriptWord } from "@/types";

type Mode = "full" | "highlights";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const projectId = body.projectId as string | undefined;
  const mode: Mode = body.mode === "highlights" ? "highlights" : "full";

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { transcript: true, captions: { orderBy: { orderIndex: "asc" } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (!project.transcript) {
    return NextResponse.json({ error: "This project has no transcript yet. Transcribe it first." }, { status: 400 });
  }

  const provider = getCaptionIntelligenceProvider();
  const transcriptWords: TranscriptWord[] = JSON.parse(project.transcript.words);

  try {
    let finalGroups: CaptionGroup[];

    if (mode === "highlights") {
      if (project.captions.length === 0) {
        return NextResponse.json({ error: "No captions exist yet to highlight. Generate captions first." }, { status: 400 });
      }
      const existingGroups: CaptionGroup[] = project.captions.map((c) => ({
        id: c.id,
        start: c.start,
        end: c.end,
        text: c.text,
        words: JSON.parse(c.words),
        highlightedWords: JSON.parse(c.highlightedWords),
      }));
      finalGroups = await provider.detectHighlights(existingGroups);
    } else {
      const settings: CaptionSettings = JSON.parse(project.captionSettings);
      const chunked = await provider.createCaptionGroups(transcriptWords, settings);
      finalGroups = await provider.detectHighlights(chunked);
    }

    await prisma.$transaction(async (tx) => {
      if (mode === "full") {
        await tx.caption.deleteMany({ where: { projectId } });
        await tx.caption.createMany({
          data: finalGroups.map((g, i) => ({
            projectId,
            orderIndex: i,
            start: g.start,
            end: g.end,
            text: g.text,
            words: JSON.stringify(g.words),
            highlightedWords: JSON.stringify(g.highlightedWords),
          })),
        });
      } else {
        for (const g of finalGroups) {
          await tx.caption.update({
            where: { id: g.id },
            data: { highlightedWords: JSON.stringify(g.highlightedWords) },
          });
        }
      }
      await tx.project.update({ where: { id: projectId }, data: { status: "ready" } });
    });

    const updated = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: { video: true, transcript: true, captions: true },
    });

    return NextResponse.json({ project: serializeProject(updated) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Caption generation failed unexpectedly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
