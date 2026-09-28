"use client";

import { forwardRef, type VideoHTMLAttributes } from "react";

type VideoPlayerProps = { src: string; className?: string } & Omit<
  VideoHTMLAttributes<HTMLVideoElement>,
  "src" | "className" | "controls"
>;

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(function VideoPlayer(
  { src, className, ...rest },
  ref
) {
  return (
    <video
      ref={ref}
      src={src}
      controls
      className={className ?? "h-full w-full rounded-lg bg-black object-contain"}
      {...rest}
    />
  );
});
