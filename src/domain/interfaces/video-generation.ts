export type VideoProvider = 'runway' | 'luma';

export type VideoTaskStatus = 'queued' | 'processing' | 'succeeded' | 'failed';

export interface GenerateVideoInput {
  prompt: string;
  provider: VideoProvider;
  durationSeconds?: number;
  aspectRatio?: string;
  imageUrl?: string;
  model?: string;
  webhookUrl?: string;
}

export interface VideoGenerationTask {
  taskId: string;
  provider: VideoProvider;
  providerTaskId: string;
  status: VideoTaskStatus;
  progress: number;
  prompt: string;
  model: string;
  outputUrl: string | null;
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
