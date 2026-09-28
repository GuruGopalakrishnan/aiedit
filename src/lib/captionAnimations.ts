import type { Variants } from "motion/react";
import type { CaptionAnimation } from "@/types";

/**
 * Enter/exit variants for each of the 7 caption animation templates. Applied
 * to the whole caption block as the active caption changes; "word-highlight"
 * keeps the block itself a plain fade since its motion lives on individual
 * words (see CaptionOverlay's per-word motion.span).
 */
export const CAPTION_ANIMATION_VARIANTS: Record<CaptionAnimation, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.25 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  },
  pop: {
    initial: { opacity: 0, scale: 0.85 },
    animate: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 420, damping: 16 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
  },
  "slide-up": {
    initial: { opacity: 0, y: 36 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: -18, transition: { duration: 0.2 } },
  },
  "slide-left": {
    initial: { opacity: 0, x: -60 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, x: 60, transition: { duration: 0.2 } },
  },
  bounce: {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 12, bounce: 0.35 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
  },
  "word-highlight": {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  },
};
