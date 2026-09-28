"use client";

import { forwardRef } from "react";

export const VideoPlayer = forwardRef<HTMLVideoElement, { src: string; className?: string }>(
  function VideoPlayer({ src, className }, ref) {
    return (
      <video
        ref={ref}
        src={src}
        controls
        className={className ?? "h-full w-full rounded-lg bg-black object-contain"}
      />
    );
  }
);
