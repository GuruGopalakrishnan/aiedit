# AI Caption Studio

AI-assisted animated captions for talking-head videos. Upload a video, get an
accurately timed transcript, automatically chunked and highlighted captions,
pick an animated style, edit anything by hand, and export a final MP4.

This is **not** a full video editor — no B-roll, stock footage, or music
generation. The pipeline is: **Talking Video → AI Captions → Animated
Captions → Final MP4**.

## Technology stack

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **Video rendering**: Remotion (captions, animations, final MP4 export)
- **Video processing**: FFmpeg (`fluent-ffmpeg` + static binaries — no system
  FFmpeg install required)
- **Transcription**: pluggable `TranscriptionProvider` interface, initial
  implementation targets OpenAI Whisper / Speech-to-Text, with a mock mode
  for development without an API key
- **Database**: SQLite via Prisma
- **Storage**: local filesystem under `/storage` (architected to swap in
  Cloudflare R2 / S3 / Supabase Storage later)

## Prerequisites

- Node.js 20+ and npm
- No manual FFmpeg install needed — `ffmpeg-static` and `ffprobe-static`
  ship platform binaries and are resolved at runtime (Windows, macOS, Linux
  all supported). If you ever see an `ENOENT` spawning ffmpeg/ffprobe from a
  Next.js API route, check that `next.config.ts` still lists them under
  `serverExternalPackages` — bundling those packages breaks their
  `__dirname`-based binary path lookup.

## Installation

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

The app runs at http://localhost:3000 and redirects to `/dashboard`.

## Environment variables

See `.env.example`. Key variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite connection string, e.g. `file:./dev.db` |
| `OPENAI_API_KEY` | Whisper/Speech-to-Text key. Leave blank to run transcription in mock mode. |
| `STORAGE_ROOT` | Local storage root directory (uploads/audio/renders/thumbnails). |
| `MAX_UPLOAD_SIZE_MB` / `MAX_UPLOAD_DURATION_MIN` | Upload limits, configurable. |

## Database setup

```bash
npx prisma migrate dev --name <description>   # after schema.prisma changes
npx prisma studio                              # inspect data visually
```

Models: `Project`, `VideoAsset`, `Transcript`, `Caption`, `RenderJob`. See
`prisma/schema.prisma`.

## Transcription setup

Transcription is behind the `TranscriptionProvider` interface
(`src/types/index.ts`) so providers can be swapped without touching the rest
of the pipeline. With no `OPENAI_API_KEY` set, the app falls back to a mock
provider so upload → caption editing → rendering can still be exercised
end-to-end in development.

## Remotion setup

The final-render composition lives under `/remotion` (`CaptionedVideo.tsx`,
registered in `Root.tsx`/`index.ts`). It shares its timing/positioning/style
logic with the browser preview via `src/lib/captionStyle.ts` (same
`findActiveCaption`/`findActiveWordId`, same position/stroke/background
math), so preview and render agree on *what* should be on screen and *when*.
They do **not** share an animation engine: the browser preview uses Motion
(wall-clock, spring physics), while Remotion renders frame-by-frame and
needs every value to be a pure function of the frame number, so the same 7
animation templates are reimplemented in `remotion/animations.ts` using
Remotion's `interpolate`/`spring`. The two are tuned to look the same, not
guaranteed pixel-identical.

Useful commands:

```bash
npm run remotion:studio  # interactive preview/scrub in Remotion Studio
npm run remotion:render  # render remotion/index.ts's CaptionedVideo composition to out/render.mp4
```

`remotion:render` needs `--props=<path-to-json>` with `videoSrc` (an
`http(s)://` URL — Remotion's renderer can't read an arbitrary local
`file://` path directly, so point it at this app's own
`/api/media/uploads/<file>` while `npm run dev` is running), `captions`,
`style`, `durationInSeconds`, `fps`, `width`, `height`. `remotion.config.ts`
adds the `@/*` → `src/*` webpack alias Remotion's bundler doesn't pick up
from `tsconfig.json` on its own.

## Rendering / export

Renders run as an async job (`RenderJob`: `QUEUED → PROCESSING → COMPLETED
/ FAILED`) so the UI never blocks on a render. For local development a
simple in-process worker is used; the job model is intentionally shaped so
Redis/BullMQ can replace it later without changing the API surface.

## Development server

```bash
npm run dev      # start
npm run build    # production build
npx tsc --noEmit # type-check
```

## Troubleshooting

- **`ffprobe.exe ENOENT` / ffmpeg spawn errors**: confirm
  `serverExternalPackages` in `next.config.ts` includes `fluent-ffmpeg`,
  `ffmpeg-static`, and `ffprobe-static`. Next.js bundles server code by
  default, which breaks these packages' runtime binary path resolution.
- **Upload rejected**: check the file extension (`.mp4`, `.mov`, `.webm`
  only) and the configured size/duration limits in `.env`.
- **Remotion render fails with `Module not found: Can't resolve '@/lib/...'`**:
  `remotion.config.ts`'s webpack alias override is missing or was reverted —
  Remotion's bundler doesn't read `tsconfig.json` paths on its own.
- **Remotion render fails with `Can't resolve 'path'` (or another Node
  built-in) from a `src/lib/*` file**: some file imported by the composition
  pulls in a Node-only module transitively (Remotion's bundle runs in
  headless Chrome, no Node polyfills). Split the browser-safe constants
  (like `DEFAULT_EXPORT` in `src/lib/exportDefaults.ts`) out of the
  Node-dependent file rather than importing the whole thing.
- **Remotion render fails with `Can only download URLs starting with
  http:// or https://`**: `videoSrc` was given a local filesystem path.
  Use an `http(s)://` URL the renderer can fetch — the running app's own
  `/api/media/...` route works for this.
- **Empty dashboard after upload**: check the terminal running `npm run dev`
  for the actual FFmpeg/transcription error — the API always returns a
  specific error message rather than a generic failure.

## Folder structure

```text
/src
  /app
    /dashboard              project list + create
    /editor/[projectId]     caption editor
    /api
      /projects             list/create/get/update/delete/duplicate
      /media/[...path]      streams files out of /storage (range requests supported)
      /transcribe           word-level transcription (OpenAI Whisper, mock fallback)
      /analyze-captions     caption chunking + keyword highlighting (full or highlights-only regeneration)
      /captions/[id]        manual per-caption text/highlight edits
      /render               (Phase 7)
  /components               VideoUploader, VideoPlayer, ProjectCard, CaptionEditor,
                             CaptionOverlay, CaptionSettingsPanel, Timeline, ColorPicker, ...
  /lib                      config, prisma client, presets, serializers, captionStyle (timing/position/style helpers)
  /services
    /video                  ffmpeg metadata/thumbnail/audio extraction
    /transcription          OpenAIWhisperProvider + MockTranscriptionProvider behind TranscriptionProvider
    /captions               chunking.ts + highlighting.ts (rule-based) and an OpenAI-backed provider behind CaptionIntelligenceProvider
    /ai                     AI prompts/providers
    /render                 (Phase 7)
  /types                    shared domain types + provider interfaces
/remotion                   final-render composition (CaptionedVideo, Root, index) + frame-based animations.ts
/prisma                     schema + migrations
/storage
  /uploads /audio /renders /thumbnails
```

## Project status

Build is being delivered in phases (see the original spec for the full
list).

- **Phase 1 (Foundation) — complete and tested**: project dashboard,
  project creation, drag-and-drop video upload, metadata extraction
  (duration/resolution/size/thumbnail), and video preview in the editor
  shell all work end-to-end.
- **Phase 2 (Transcription) — complete and tested**: audio is transcribed
  automatically right after upload (word-level timestamps via OpenAI
  Whisper, or a deterministic mock provider when `OPENAI_API_KEY` is
  unset so the pipeline stays testable without an API key). The editor
  exposes a Transcribe/Retry action and displays the transcript. Verified
  end-to-end against a real uploaded file, including the no-audio-path
  fallback and error paths (missing project, missing video).
- **Phase 3 (Caption Engine) — complete and tested**: transcripts are
  chunked into short, punctuation/pause-aware caption groups (2-7 words by
  default, configurable), with at most one important word or phrase
  highlighted per caption (numbers/time periods/money first, then
  emotional/business keywords) — via OpenAI when `OPENAI_API_KEY` is set,
  otherwise a deterministic rule-based engine
  (`src/services/captions/chunking.ts` + `highlighting.ts`) so the whole
  pipeline works without an API key. Caption generation runs automatically
  after transcription; the editor lets you regenerate chunks (with a
  destructive-edit warning) or regenerate highlights only (preserves
  manually edited text), edit any caption's text inline, and click a word
  to toggle its highlight. Verified end-to-end: chunk quality traced by
  hand against the raw mock transcript, text edits and highlight toggles
  confirmed to persist, highlights-only regeneration confirmed to leave
  edited text untouched, and the no-transcript error path checked.
  Caption merge/split are not implemented yet (tracked as future work,
  per the spec's own phase boundaries).
- **Phase 4 (Video Caption Preview) — complete and tested**: the editor
  overlays the currently-active caption on the video preview in real time
  (synced to actual `<video>` playback via `timeupdate`), scaled correctly
  for the preview's rendered size against the canonical 1080px-wide canvas
  the style settings are authored against. The full caption settings panel
  is wired to live PATCH-based autosave (debounced, so dragging a slider
  doesn't spam the API): presets, font family/weight/size, alignment, all
  7 position presets, text/highlight color pickers, stroke, shadow,
  background, text case, and a toggleable safe-area guide. An "active word"
  mode does real-time karaoke-style word-by-word highlighting driven by
  word-level timestamps, independent of the AI-selected keyword highlight.
  A visual timeline renders proportional caption blocks with a live
  playhead and click-to-seek (on a block or anywhere on the bar). Verified:
  the active-caption/active-word timing functions unit-tested directly
  (correct caption/word selection, and correctly returns nothing in the
  gap between two captions) and preset/style changes confirmed to persist
  via the PATCH API and survive a fresh reload — animated transitions
  themselves shipped in Phase 5.
- **Phase 5 (Animation System) — complete and tested**: all 7 templates
  from the spec (Fade, Pop, Slide Up, Slide Left, Bounce, Scale, Word
  Highlight) are implemented with [Motion](https://motion.dev) — the
  caption block enters/exits with the selected template's variants as the
  active caption changes (`AnimatePresence` keyed by caption id, see
  `src/lib/captionAnimations.ts`), and every word independently animates
  its color/scale when it becomes highlighted, whether that's the
  AI-selected keyword (Phase 3) or, with "active word" mode on, the word
  currently being spoken (karaoke-style). An Animation selector was added
  to the caption settings panel, using the same debounced-PATCH autosave
  as the rest of the style controls. Verified: tsc/build/eslint all clean,
  and all 7 animation values round-tripped through the style PATCH API
  end-to-end. The animations themselves (easing curves, spring bounce
  feel) were reviewed by reading the Motion variant definitions rather
  than watching them play, since no browser automation tool is available
  in this environment — worth a quick look in the browser to confirm they
  feel right, particularly the bounce/pop spring tuning.
- **Phase 6 (Remotion) — complete and tested**: `remotion/CaptionedVideo.tsx`
  renders the video plus the same caption content/timing/positioning as the
  browser preview (reusing `src/lib/captionStyle.ts`), with all 7 animation
  templates reimplemented as frame-pure functions in `remotion/animations.ts`
  (`interpolate`/`spring` instead of Motion, since Remotion renders each
  frame independently and can't rely on wall-clock animation state).
  Composition duration/fps/dimensions are computed from props via
  `calculateMetadata`. Verified for real, not just by building: actually ran
  `npm run remotion:render` end-to-end against a real uploaded test video
  and a realistic 6-caption dataset (with a keyword highlight), producing a
  genuine playable MP4 (h264/aac, 1080×1920, 30fps, correct ~3s duration per
  `ffprobe`), and visually confirmed via extracted frames that the right
  caption text appears at the right timestamps with the configured font
  weight, stroke and center position. Two real bugs surfaced and fixed by
  this render test (not caught by tsc/build, since neither touches
  Remotion's own bundler): the `@/*` path alias needed an explicit
  `remotion.config.ts` webpack override, and `DEFAULT_EXPORT` had to move
  out of `src/lib/config.ts` into a Node-dependency-free
  `src/lib/exportDefaults.ts` because Remotion's browser-targeted bundle
  can't polyfill Node's `path` module. This is exactly the kind of gap that
  build/type-check alone would have missed, which is why the extra step of
  actually rendering something was worth taking.

Remaining phases (Phase 7: async render job + MP4 download endpoint, Phase
8: polish) are tracked in the codebase's `/api` route stubs and service
folders.
