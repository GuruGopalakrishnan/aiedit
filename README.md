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

Caption rendering, animation templates, and final MP4 export are implemented
as Remotion compositions under `/remotion`. Preview uses the same
compositions as the final render so what you see matches the export.

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
      /transcribe           (Phase 2)
      /analyze-captions     (Phase 3)
      /render               (Phase 7)
  /components               VideoUploader, VideoPlayer, ProjectCard, ...
  /lib                      config, prisma client, presets, serializers
  /services
    /video                  ffmpeg metadata/thumbnail/audio extraction
    /transcription          (Phase 2)
    /captions               (Phase 3)
    /ai                     AI prompts/providers
    /render                 (Phase 7)
  /types                    shared domain types + provider interfaces
/remotion                   caption animation templates + composition (Phase 5/6)
/prisma                     schema + migrations
/storage
  /uploads /audio /renders /thumbnails
```

## Project status

Build is being delivered in phases (see the original spec for the full
list). **Phase 1 (Foundation) is complete and tested**: project dashboard,
project creation, drag-and-drop video upload, metadata extraction (duration/
resolution/size/thumbnail), and video preview in the editor shell all work
end-to-end. Remaining phases (transcription, caption engine, animated
preview, Remotion rendering, export, polish) are tracked in the codebase's
`/api` route stubs and service folders.
