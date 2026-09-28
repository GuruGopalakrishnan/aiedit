import type { Project as PrismaProject, VideoAsset as PrismaVideoAsset, Transcript as PrismaTranscript, Caption as PrismaCaption } from "@prisma/client";
import type { CaptionGroup, CaptionSettings, CaptionStyle, Project, TranscriptWord, VideoAssetMeta } from "@/types";

type ProjectWithRelations = PrismaProject & {
  video: PrismaVideoAsset | null;
  transcript: PrismaTranscript | null;
  captions: PrismaCaption[];
};

export function serializeVideo(video: PrismaVideoAsset | null): VideoAssetMeta | null {
  if (!video) return null;
  return {
    id: video.id,
    filename: video.filename,
    originalPath: video.originalPath,
    audioPath: video.audioPath ?? undefined,
    duration: video.duration,
    width: video.width,
    height: video.height,
    fileSize: video.fileSize,
    thumbnailPath: video.thumbnailPath ?? undefined,
    aspectRatio: video.aspectRatio as VideoAssetMeta["aspectRatio"],
  };
}

export function serializeProject(project: ProjectWithRelations): Project {
  const transcriptWords: TranscriptWord[] = project.transcript
    ? JSON.parse(project.transcript.words)
    : [];

  const captions: CaptionGroup[] = [...project.captions]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((c) => ({
      id: c.id,
      start: c.start,
      end: c.end,
      text: c.text,
      words: JSON.parse(c.words),
      highlightedWords: JSON.parse(c.highlightedWords),
    }));

  return {
    id: project.id,
    name: project.name,
    status: project.status as Project["status"],
    video: serializeVideo(project.video),
    transcript: transcriptWords,
    captions,
    captionSettings: JSON.parse(project.captionSettings) as CaptionSettings,
    styleSettings: JSON.parse(project.styleSettings) as CaptionStyle,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
