// Curated open-source font library, loaded via @remotion/google-fonts so the
// exact same @font-face declarations are available in the browser preview
// (Next.js DOM) and inside Remotion's headless-Chrome render -- the two
// environments must agree or "preview matches export" breaks.
//
// Each font is loaded eagerly (as a module-load side effect) with its full
// weight/subset set. That's a handful of small @font-face CSS rules, not the
// actual glyph data -- browsers only fetch the woff2 file once the font is
// actually used to lay out text, so this stays cheap even for ~25 fonts.

import { loadFont as loadInter, fontFamily as interFamily } from "@remotion/google-fonts/Inter";
import { loadFont as loadPoppins, fontFamily as poppinsFamily } from "@remotion/google-fonts/Poppins";
import { loadFont as loadMontserrat, fontFamily as montserratFamily } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadBebasNeue, fontFamily as bebasNeueFamily } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadAnton, fontFamily as antonFamily } from "@remotion/google-fonts/Anton";
import { loadFont as loadOswald, fontFamily as oswaldFamily } from "@remotion/google-fonts/Oswald";
import { loadFont as loadArchivoBlack, fontFamily as archivoBlackFamily } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadLeagueSpartan, fontFamily as leagueSpartanFamily } from "@remotion/google-fonts/LeagueSpartan";
import { loadFont as loadDMSans, fontFamily as dmSansFamily } from "@remotion/google-fonts/DMSans";
import { loadFont as loadManrope, fontFamily as manropeFamily } from "@remotion/google-fonts/Manrope";
import { loadFont as loadOutfit, fontFamily as outfitFamily } from "@remotion/google-fonts/Outfit";
import { loadFont as loadSpaceGrotesk, fontFamily as spaceGroteskFamily } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadUrbanist, fontFamily as urbanistFamily } from "@remotion/google-fonts/Urbanist";
import { loadFont as loadBarlowCondensed, fontFamily as barlowCondensedFamily } from "@remotion/google-fonts/BarlowCondensed";
import { loadFont as loadRobotoCondensed, fontFamily as robotoCondensedFamily } from "@remotion/google-fonts/RobotoCondensed";
import { loadFont as loadPlayfairDisplay, fontFamily as playfairDisplayFamily } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadMerriweather, fontFamily as merriweatherFamily } from "@remotion/google-fonts/Merriweather";
import { loadFont as loadLora, fontFamily as loraFamily } from "@remotion/google-fonts/Lora";
import { loadFont as loadRaleway, fontFamily as ralewayFamily } from "@remotion/google-fonts/Raleway";
import { loadFont as loadRubik, fontFamily as rubikFamily } from "@remotion/google-fonts/Rubik";
import { loadFont as loadPlusJakartaSans, fontFamily as plusJakartaSansFamily } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadBricolageGrotesque, fontFamily as bricolageGrotesqueFamily } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadNotoSansTamil, fontFamily as notoSansTamilFamily } from "@remotion/google-fonts/NotoSansTamil";
import { loadFont as loadBaloo2, fontFamily as baloo2Family } from "@remotion/google-fonts/Baloo2";
import { loadFont as loadCatamaran, fontFamily as catamaranFamily } from "@remotion/google-fonts/Catamaran";
import { loadFont as loadHindMadurai, fontFamily as hindMaduraiFamily } from "@remotion/google-fonts/HindMadurai";

export type FontCategory =
  | "bold"
  | "modern"
  | "minimal"
  | "editorial"
  | "condensed"
  | "serif"
  | "display"
  | "playful"
  | "tamil";

export type FontEntry = {
  fontFamily: string;
  name: string;
  categories: FontCategory[];
  supportsTamil: boolean;
  load: () => void;
};

export const FALLBACK_TAMIL_FONT = notoSansTamilFamily;

export const FONT_LIBRARY: FontEntry[] = [
  { fontFamily: interFamily, name: "Inter", categories: ["minimal", "modern"], supportsTamil: false, load: loadInter },
  { fontFamily: poppinsFamily, name: "Poppins", categories: ["modern"], supportsTamil: false, load: loadPoppins },
  { fontFamily: montserratFamily, name: "Montserrat", categories: ["modern"], supportsTamil: false, load: loadMontserrat },
  { fontFamily: bebasNeueFamily, name: "Bebas Neue", categories: ["display", "condensed", "bold"], supportsTamil: false, load: loadBebasNeue },
  { fontFamily: antonFamily, name: "Anton", categories: ["bold", "display"], supportsTamil: false, load: loadAnton },
  { fontFamily: oswaldFamily, name: "Oswald", categories: ["condensed", "bold"], supportsTamil: false, load: loadOswald },
  { fontFamily: archivoBlackFamily, name: "Archivo Black", categories: ["bold", "display"], supportsTamil: false, load: loadArchivoBlack },
  { fontFamily: leagueSpartanFamily, name: "League Spartan", categories: ["modern", "minimal"], supportsTamil: false, load: loadLeagueSpartan },
  { fontFamily: dmSansFamily, name: "DM Sans", categories: ["minimal"], supportsTamil: false, load: loadDMSans },
  { fontFamily: manropeFamily, name: "Manrope", categories: ["modern", "minimal"], supportsTamil: false, load: loadManrope },
  { fontFamily: outfitFamily, name: "Outfit", categories: ["modern"], supportsTamil: false, load: loadOutfit },
  { fontFamily: spaceGroteskFamily, name: "Space Grotesk", categories: ["modern", "editorial"], supportsTamil: false, load: loadSpaceGrotesk },
  { fontFamily: urbanistFamily, name: "Urbanist", categories: ["modern", "minimal"], supportsTamil: false, load: loadUrbanist },
  { fontFamily: barlowCondensedFamily, name: "Barlow Condensed", categories: ["condensed"], supportsTamil: false, load: loadBarlowCondensed },
  { fontFamily: robotoCondensedFamily, name: "Roboto Condensed", categories: ["condensed"], supportsTamil: false, load: loadRobotoCondensed },
  { fontFamily: playfairDisplayFamily, name: "Playfair Display", categories: ["serif", "editorial"], supportsTamil: false, load: loadPlayfairDisplay },
  { fontFamily: merriweatherFamily, name: "Merriweather", categories: ["serif", "editorial"], supportsTamil: false, load: loadMerriweather },
  { fontFamily: loraFamily, name: "Lora", categories: ["serif", "editorial"], supportsTamil: false, load: loadLora },
  { fontFamily: ralewayFamily, name: "Raleway", categories: ["modern", "minimal"], supportsTamil: false, load: loadRaleway },
  { fontFamily: rubikFamily, name: "Rubik", categories: ["playful", "modern"], supportsTamil: false, load: loadRubik },
  { fontFamily: plusJakartaSansFamily, name: "Plus Jakarta Sans", categories: ["modern", "minimal"], supportsTamil: false, load: loadPlusJakartaSans },
  { fontFamily: bricolageGrotesqueFamily, name: "Bricolage Grotesque", categories: ["display", "playful"], supportsTamil: false, load: loadBricolageGrotesque },
  { fontFamily: notoSansTamilFamily, name: "Noto Sans Tamil", categories: ["tamil", "minimal"], supportsTamil: true, load: loadNotoSansTamil },
  { fontFamily: baloo2Family, name: "Baloo Two", categories: ["tamil", "playful", "bold"], supportsTamil: true, load: loadBaloo2 },
  { fontFamily: catamaranFamily, name: "Catamaran", categories: ["tamil", "modern"], supportsTamil: true, load: loadCatamaran },
  { fontFamily: hindMaduraiFamily, name: "Hind Madurai", categories: ["tamil", "minimal"], supportsTamil: true, load: loadHindMadurai },
];

// Load every curated font's @font-face rules up front (cheap: CSS rules
// only, not the woff2 files themselves) so any theme/preset can reference
// any of them without a per-selection async load step.
if (typeof document !== "undefined" || typeof process !== "undefined") {
  for (const f of FONT_LIBRARY) {
    try {
      f.load();
    } catch {
      // Rendering environments without a DOM (e.g. a plain Node test runner)
      // silently skip font injection -- loadFont() itself already no-ops
      // when `FontFace` is undefined.
    }
  }
}

const BY_FAMILY = new Map(FONT_LIBRARY.map((f) => [f.fontFamily, f]));

export function getFontEntry(fontFamily: string): FontEntry | undefined {
  return BY_FAMILY.get(fontFamily);
}

export function fontSupportsTamil(fontFamily: string): boolean {
  return BY_FAMILY.get(fontFamily)?.supportsTamil ?? false;
}

const TAMIL_RANGE = /[஀-௿]/;

export function containsTamil(text: string): boolean {
  return TAMIL_RANGE.test(text);
}

/** Resolves the font a specific word should render in, falling back to a Tamil-capable font for Tamil words when the caption's chosen font doesn't support them (avoids missing-glyph "tofu" boxes). */
export function resolveWordFontFamily(text: string, captionFontFamily: string): string {
  if (containsTamil(text) && !fontSupportsTamil(captionFontFamily)) {
    return FALLBACK_TAMIL_FONT;
  }
  return captionFontFamily;
}
