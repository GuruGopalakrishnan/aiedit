import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { STORAGE_DIRS } from "@/lib/config";
import type { CaptionGroup, CaptionStyle, RenderQuality } from "@/types";

const QUALITY_CRF: Record<RenderQuality, number> = {
  draft: 30,
  standard: 23,
  high: 16,
};

export type RenderProjectInput = {
  jobId: string;
  videoUrl: string; // http(s) URL the renderer can fetch -- see README's Remotion setup notes
  durationInSeconds: number;
  width: number;
  height: number;
  fps: number;
  captions: CaptionGroup[];
  style: CaptionStyle;
  quality: RenderQuality;
  onProgress: (progress: number) => void;
};

let cachedBundleUrl: string | null = null;

async function getBundleUrl(): Promise<string> {
  if (cachedBundleUrl) return cachedBundleUrl;
  cachedBundleUrl = await bundle({
    // remotion.config.ts's webpack override is only auto-applied by the Remotion
    // CLI; bundle() called programmatically (as here) needs it passed directly.
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          "@": path.resolve(process.cwd(), "src"),
        },
      },
    }),
    entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
    onProgress: () => {},
  });
  return cachedBundleUrl;
}

/** Renders the project's captioned video to an MP4 under STORAGE_DIRS.renders, returning its absolute path. */
export async function renderProject(input: RenderProjectInput): Promise<string> {
  const serveUrl = await getBundleUrl();

  const inputProps = {
    videoSrc: input.videoUrl,
    captions: input.captions,
    style: input.style,
    showSafeArea: false,
    durationInSeconds: input.durationInSeconds,
    fps: input.fps,
    width: input.width,
    height: input.height,
  };

  const composition = await selectComposition({
    serveUrl,
    id: "CaptionedVideo",
    inputProps,
  });

  const outputLocation = path.join(STORAGE_DIRS.renders, `${input.jobId}.mp4`);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps,
    crf: QUALITY_CRF[input.quality],
    onProgress: ({ progress }) => input.onProgress(Math.round(progress * 100)),
  });

  return outputLocation;
}
