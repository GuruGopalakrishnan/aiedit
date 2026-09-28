import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobePath from "ffprobe-static";
import path from "path";
import fs from "fs/promises";
import { STORAGE_DIRS } from "@/lib/config";
import type { AspectRatio } from "@/types";

ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
ffmpeg.setFfprobePath(ffprobePath.path);

export type ExtractedMetadata = {
  duration: number;
  width: number;
  height: number;
  fileSize: number;
};

export function probeVideo(filePath: string): Promise<ExtractedMetadata> {
  return new Promise(async (resolve, reject) => {
    try {
      const stat = await fs.stat(filePath);
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) {
          reject(new Error(`FFprobe failed to read video metadata: ${err.message}`));
          return;
        }
        const videoStream = data.streams.find((s) => s.codec_type === "video");
        if (!videoStream) {
          reject(new Error("No video stream found in the uploaded file."));
          return;
        }
        resolve({
          duration: data.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fileSize: stat.size,
        });
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error("Failed to stat uploaded file."));
    }
  });
}

export function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        reject(new Error(`FFprobe failed to read audio duration: ${err.message}`));
        return;
      }
      resolve(data.format.duration || 0);
    });
  });
}

export function resolveAspectRatio(width: number, height: number): AspectRatio {
  const ratio = width / height;
  if (Math.abs(ratio - 9 / 16) < 0.08) return "9:16";
  if (Math.abs(ratio - 1) < 0.08) return "1:1";
  return "16:9";
}

export function generateThumbnail(videoPath: string, projectId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const thumbFilename = `${projectId}.jpg`;
    const thumbPath = path.join(STORAGE_DIRS.thumbnails, thumbFilename);
    ffmpeg(videoPath)
      .on("end", () => resolve(thumbPath))
      .on("error", (err) => reject(new Error(`Thumbnail generation failed: ${err.message}`)))
      .screenshots({
        timestamps: ["1"],
        filename: thumbFilename,
        folder: STORAGE_DIRS.thumbnails,
        size: "480x?",
      });
  });
}

export function extractAudio(videoPath: string, projectId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const audioFilename = `${projectId}.wav`;
    const audioPath = path.join(STORAGE_DIRS.audio, audioFilename);
    ffmpeg(videoPath)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .format("wav")
      .on("end", () => resolve(audioPath))
      .on("error", (err) => reject(new Error(`Audio extraction failed: ${err.message}`)))
      .save(audioPath);
  });
}
