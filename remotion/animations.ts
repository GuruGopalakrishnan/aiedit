import { interpolate, spring } from "remotion";
import type { CaptionAnimation } from "@/types";

const ENTER_MS = 250;
const EXIT_MS = 180;

export type FrameBlockStyle = { opacity: number; transform: string };

function clamped(frame: number, inputRange: [number, number], outputRange: [number, number]) {
  return interpolate(frame, inputRange, outputRange, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}

/**
 * Frame-accurate equivalent of src/lib/captionAnimations.ts, since Motion's
 * wall-clock/spring physics aren't reproducible across Remotion's
 * independently-rendered frames -- every value here must be a pure function
 * of `framesIn`/`framesToEnd` alone.
 */
export function getCaptionFrameStyle(
  animation: CaptionAnimation,
  framesIn: number,
  framesToEnd: number,
  fps: number
): FrameBlockStyle {
  const enterFrames = Math.max(1, Math.round((ENTER_MS / 1000) * fps));
  const exitFrames = Math.max(1, Math.round((EXIT_MS / 1000) * fps));
  const isExiting = framesToEnd <= exitFrames;

  const fadeIn = clamped(framesIn, [0, enterFrames], [0, 1]);
  const fadeOut = clamped(framesToEnd, [0, exitFrames], [0, 1]);
  const opacity = Math.min(fadeIn, fadeOut);

  switch (animation) {
    case "fade":
    case "word-highlight":
      return { opacity, transform: "none" };

    case "pop": {
      const scale = isExiting
        ? clamped(framesToEnd, [0, exitFrames], [0.9, 1])
        : spring({ frame: framesIn, fps, config: { damping: 16, stiffness: 420, mass: 0.6 }, from: 0.85, to: 1 });
      return { opacity, transform: `scale(${scale})` };
    }

    case "scale": {
      const scale = isExiting ? clamped(framesToEnd, [0, exitFrames], [0.95, 1]) : clamped(framesIn, [0, enterFrames], [0.9, 1]);
      return { opacity, transform: `scale(${scale})` };
    }

    case "bounce": {
      const y = isExiting
        ? clamped(framesToEnd, [0, exitFrames], [-10, 0])
        : spring({ frame: framesIn, fps, config: { damping: 11, stiffness: 280, mass: 0.7 }, from: 14, to: 0 });
      return { opacity, transform: `translateY(${y}px)` };
    }

    case "slide-up": {
      const y = isExiting ? clamped(framesToEnd, [0, exitFrames], [-18, 0]) : clamped(framesIn, [0, enterFrames], [36, 0]);
      return { opacity, transform: `translateY(${y}px)` };
    }

    case "slide-left": {
      const x = isExiting ? clamped(framesToEnd, [0, exitFrames], [60, 0]) : clamped(framesIn, [0, enterFrames], [-60, 0]);
      return { opacity, transform: `translateX(${x}px)` };
    }

    default:
      return { opacity, transform: "none" };
  }
}

/** Subtle pop applied to a word the instant it becomes highlighted (keyword emphasis or active-word/karaoke mode). */
export function getWordScale(framesSinceHighlighted: number, fps: number): number {
  return spring({
    frame: Math.max(0, framesSinceHighlighted),
    fps,
    config: { damping: 14, stiffness: 300, mass: 0.5 },
    from: 1,
    to: 1.08,
  });
}
