import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These ship native/static binaries and must be resolved at runtime via real
  // filesystem paths, not bundled — bundling breaks __dirname-based path lookup.
  serverExternalPackages: ["fluent-ffmpeg", "ffmpeg-static", "ffprobe-static"],
};

export default nextConfig;
