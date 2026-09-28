// Deliberately dependency-free (no Node built-ins) so it can be imported from
// the Remotion bundle, which runs in headless Chrome and has no Node polyfills.
export const DEFAULT_EXPORT = {
  width: 1080,
  height: 1920,
  fps: 30,
  codec: "h264" as const,
};
