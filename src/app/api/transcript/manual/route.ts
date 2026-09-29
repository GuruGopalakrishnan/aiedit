import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serializers";
import { parseManualTranscript } from "@/lib/manualTranscript";

// Accepts a user-supplied transcript in place of automatic speech-to-text —
// for source videos where the words are already known (e.g. a scripted
// voiceover) and running Whisper again would just be a way to get it wrong.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const projectId = body.projectId as string | undefined;
  const transcriptText = body.transcriptText as string | undefined;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }
  if (!transcriptText || !transcriptText.trim()) {
    return NextResponse.json({ error: "transcriptText is required." }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { video: true } });
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (!project.video) {
    return NextResponse.json({ error: "This project has no video yet." }, { status: 400 });
  }

  const { words, rawText } = parseManualTranscript(transcriptText, project.video.duration);
  if (words.length === 0) {
    return NextResponse.json({ error: "Could not parse any words from that transcript." }, { status: 400 });
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      status: "ready",
      transcript: {
        upsert: {
          create: { words: JSON.stringify(words), rawText, language: "en" },
          update: { words: JSON.stringify(words), rawText, language: "en" },
        },
      },
    },
    include: { video: true, transcript: true, captions: true },
  });

  return NextResponse.json({ project: serializeProject(updated) });
}
