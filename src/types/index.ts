// Core domain types shared across the app, API routes, and Remotion compositions.

export type AspectRatio = "9:16" | "1:1" | "16:9";

export type TranscriptWord = {
  id: string;
  text: string;
  start: number; // seconds
  end: number; // seconds
  confidence?: number;
};

export type CaptionGroup = {
  id: string;
  start: number;
  end: number;
  text: string;
  words: TranscriptWord[];
  highlightedWords: string[]; // TranscriptWord.id values from `words` marked for highlight emphasis
  styleOverrides: Partial<CaptionStyle>; // per-scene overrides layered on top of the project's styleSettings
};

export type CaptionDecoration = "none" | "marker" | "underline" | "gradient";

export type CaptionPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type CaptionAnimation =
  | "fade"
  | "pop"
  | "slide-up"
  | "slide-left"
  | "word-highlight"
  | "bounce"
  | "scale";

export type FontWeight = "regular" | "medium" | "semibold" | "bold" | "extrabold";
export type StrokeWidth = "none" | "thin" | "medium" | "thick";
export type BackgroundStyle = "none" | "solid" | "semi-transparent";
export type TextCase = "original" | "uppercase" | "lowercase" | "titlecase";
export type TextAlign = "left" | "center" | "right";

export type CaptionStyle = {
  presetId?: string;
  fontFamily: string;
  fontWeight: FontWeight;
  fontSize: number; // px, relative to a 1080x1920 canvas
  textAlign: TextAlign;
  textColor: string;
  highlightColor: string;
  stroke: StrokeWidth;
  shadow: boolean;
  background: BackgroundStyle;
  textCase: TextCase;
  position: CaptionPosition;
  animation: CaptionAnimation;
  wordHighlightEnabled: boolean;
  decoration: CaptionDecoration;
};

export type CaptionThemeCategory = "minimal" | "bold" | "kinetic" | "editorial" | "business" | "creator" | "tamil";

export type CaptionPreset = {
  id: string;
  name: string;
  description: string;
  category: CaptionThemeCategory;
  style: CaptionStyle;
};

export type ChunkingLength = "short" | "medium" | "long";

export type CaptionSettings = {
  chunking: ChunkingLength;
  minWordsPerCaption: number;
  maxWordsPerCaption: number;
};

export type MotionTemplate = {
  id: string;
  name: string;
  duration: number; // seconds
  componentId: string; // resolved to a React component in the Remotion registry
};

export type RenderJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
export type RenderQuality = "draft" | "standard" | "high";

export type RenderJob = {
  id: string;
  projectId: string;
  status: RenderJobStatus;
  progress: number; // 0-100
  quality: RenderQuality;
  outputPath?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type VideoAssetMeta = {
  id: string;
  filename: string;
  originalPath: string;
  audioPath?: string;
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  thumbnailPath?: string;
  aspectRatio: AspectRatio;
};

export type ProjectStatus = "draft" | "transcribing" | "ready" | "rendering" | "rendered" | "failed";

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  video: VideoAssetMeta | null;
  transcript: TranscriptWord[];
  captions: CaptionGroup[];
  captionSettings: CaptionSettings;
  styleSettings: CaptionStyle;
  createdAt: string;
  updatedAt: string;
};

export type TranscriptionResult = {
  words: TranscriptWord[];
  rawText: string;
  language?: string;
};

export interface TranscriptionProvider {
  transcribe(audioFilePath: string): Promise<TranscriptionResult>;
}

export interface CaptionIntelligenceProvider {
  createCaptionGroups(
    transcript: TranscriptWord[],
    settings: CaptionSettings
  ): Promise<CaptionGroup[]>;

  detectHighlights(captions: CaptionGroup[]): Promise<CaptionGroup[]>;
}
