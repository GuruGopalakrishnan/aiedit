import { Composition } from "remotion";
import { CaptionedVideo } from "./CaptionedVideo";
import { DEFAULT_CAPTION_STYLE } from "@/lib/presets";
import { DEFAULT_EXPORT } from "@/lib/exportDefaults";

export function RemotionRoot() {
  return (
    <Composition
      id="CaptionedVideo"
      component={CaptionedVideo}
      fps={DEFAULT_EXPORT.fps}
      width={DEFAULT_EXPORT.width}
      height={DEFAULT_EXPORT.height}
      durationInFrames={DEFAULT_EXPORT.fps * 5}
      defaultProps={{
        videoSrc: "",
        captions: [],
        style: DEFAULT_CAPTION_STYLE,
        showSafeArea: false,
        durationInSeconds: 5,
        fps: DEFAULT_EXPORT.fps,
        width: DEFAULT_EXPORT.width,
        height: DEFAULT_EXPORT.height,
      }}
      calculateMetadata={async ({ props }) => ({
        fps: props.fps,
        width: props.width,
        height: props.height,
        durationInFrames: Math.max(1, Math.round(props.durationInSeconds * props.fps)),
      })}
    />
  );
}
