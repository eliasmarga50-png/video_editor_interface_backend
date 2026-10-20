export type VideoProvider = 'pollinations' | 'pexels' | 'local' | 'runway' | 'luma';

export type VideoTaskStatus = 'queued' | 'planning' | 'processing' | 'succeeded' | 'failed';

export interface GenerateVideoInput {
  prompt: string;
  provider?: VideoProvider;
  style?: string;
  vibe?: string;
  platform?: string;
  durationSeconds?: number;
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:3' | '3:4' | string;
  imageUrl?: string;
  model?: string;
  webhookUrl?: string;
}

export interface VideoClipInfo {
  id: string;
  url: string;
  thumbnailUrl?: string;
  title: string;
  durationMs: number;
  aspectRatio: string;
}

export interface VideoGenerationTask {
  taskId: string;
  provider: VideoProvider;
  providerTaskId: string;
  status: VideoTaskStatus;
  statusMessage?: string;
  progress: number;
  prompt: string;
  model: string;
  outputUrl: string | null;
  thumbnailUrl?: string | null;
  plan?: Record<string, unknown>;
  clips?: VideoClipInfo[];
  aiTrace?: Record<string, unknown>;
  limitationsNotice?: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  statusUrl: string;
}

export interface ProviderWebhookPayload {
  provider: VideoProvider;
  raw: unknown;
}

export interface IVideoGenService {
  createTask(input: GenerateVideoInput): Promise<VideoGenerationTask>;
  getTask(taskId: string): Promise<VideoGenerationTask>;
  handleWebhook(payload: ProviderWebhookPayload): Promise<VideoGenerationTask | null>;
}
