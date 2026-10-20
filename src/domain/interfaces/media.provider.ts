export interface MediaClip {
  id: string;
  url: string;
  thumbnailUrl?: string;
  title: string;
  durationMs: number;
  aspectRatio: string;
}

export interface MediaGenerationInput {
  prompt: string;
  enhancedPrompt?: string;
  style?: string;
  durationSeconds?: number;
  aspectRatio?: '9:16' | '16:9' | '1:1' | string;
  scenes?: Array<{
    sceneIndex: number;
    concept: string;
    visualPrompt: string;
    stockKeywords: string[];
    mood: string;
    startHintMs?: number;
    endHintMs?: number;
  }>;
  imageUrl?: string;
}

export interface MediaGenerationResult {
  provider: string;
  outputUrl: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  aspectRatio: string;
  clips: MediaClip[];
  limitationsNotice?: string;
}

export interface MediaProviderInfo {
  id: string;
  displayName: string;
  isFreeTier: boolean;
  isConfigured: boolean;
  missingConfigReason?: string | null;
  limitations: string;
  websiteUrl: string;
  setupInstructions: string;
}

export interface IMediaProvider {
  readonly id: string;
  readonly displayName: string;
  readonly isFreeTier: boolean;
  isConfigured(): boolean;
  getMissingConfigReason(): string | null;
  getLimitations(): string;
  getInfo(): MediaProviderInfo;
  generateVideo(input: MediaGenerationInput): Promise<MediaGenerationResult>;
}
