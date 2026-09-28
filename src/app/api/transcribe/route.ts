import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeProject } from "@/lib/serializers";
import { cleanTranscriptText, getTranscriptionProvider } from "@/services/transcription";
import { extractAudio } from "@/services/video/metadata";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const projectId = body.projectId as string | undefined;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { video: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  if (!project.video) {
    return NextResponse.json({ error: "This project has no video to transcribe." }, { status: 400 });
  }

  await prisma.project.update({ where: { id: projectId }, data: { status: "transcribing" } });

  try {
    let audioPath = project.video.audioPath;
    if (!audioPath) {
      // Fallback: audio extraction may have failed at upload time — retry now.
      audioPath = await extractAudio(project.video.originalPath, project.id);
      await prisma.videoAsset.update({ where: { id: project.video.id }, data: { audioPath } });
    }

    const provider = getTranscriptionProvider();
    const result = await provider.transcribe(audioPath);
    const rawText = cleanTranscriptText(result.rawText);

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "ready",
        transcript: {
          upsert: {
            create: { words: JSON.stringify(result.words), rawText, language: result.language },
            update: { words: JSON.stringify(result.words), rawText, language: result.language },
          },
        },
      },
      include: { video: true, transcript: true, captions: true },
    });

    return NextResponse.json({ project: serializeProject(updated) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Transcription failed unexpectedly.";
    await prisma.project.update({ where: { id: projectId }, data: { status: "failed" } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
