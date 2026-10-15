import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from '../domain/errors/app-error.js';
import type {
  GenerateVideoInput,
  IVideoGenService,
  ProviderWebhookPayload,
  VideoGenerationTask,
  VideoProvider,
  VideoTaskStatus,
} from '../domain/interfaces/video-generation.js';
import type { InMemoryTaskStore } from '../infrastructure/task-store.js';
import { fetchJson } from '../utils/http.js';
import { logger } from '../utils/logger.js';

interface RunwayCreateResponse {
  id: string;
}

interface RunwayTaskResponse {
  id: string;
  status?: string;
  progress?: number;
  output?: string[] | string | null;
  failure?: string;
  error?: string;
}

interface LumaGenerationResponse {
  id: string;
  state?: string;
  status?: string;
  failure_reason?: string;
  assets?: { video?: string; image?: string };
}

const RUNWAY_BASE = 'https://api.dev.runwayml.com/v1';
const LUMA_BASE = 'https://api.lumalabs.ai/dream-machine/v1';

export class VideoGenService implements IVideoGenService {
  constructor(private readonly store: InMemoryTaskStore) {}

  async createTask(input: GenerateVideoInput): Promise<VideoGenerationTask> {
    const prompt = input.prompt.trim();
    if (!prompt) throw AppError.badRequest('prompt is required');

    const taskId = randomUUID();
    const now = new Date().toISOString();
    const placeholder: VideoGenerationTask = {
      taskId,
      provider: input.provider,
      providerTaskId: '',
      status: 'queued',
      progress: 0,
      prompt,
      model: input.model ?? (input.provider === 'runway' ? env.RUNWAY_MODEL : env.LUMA_MODEL),
      outputUrl: null,
      error: null,
      createdAt: now,
      updatedAt: now,
      statusUrl: `${env.PUBLIC_BASE_URL}/api/v1/generate-video/${taskId}`,
    };

    logger.info({ taskId, provider: input.provider }, 'Creating video generation task');

    if (input.provider === 'runway') {
      const created = await this.createRunwayTask(input, placeholder.statusUrl);
      placeholder.providerTaskId = created.id;
      placeholder.status = 'processing';
    } else if (input.provider === 'luma') {
      const created = await this.createLumaTask(input, placeholder.statusUrl);
      placeholder.providerTaskId = created.id;
      placeholder.status = 'processing';
    } else {
      throw AppError.badRequest(`Unsupported provider: ${String(input.provider)}`);
    }

    return this.store.save({ ...placeholder, updatedAt: new Date().toISOString() });
  }

  async getTask(taskId: string): Promise<VideoGenerationTask> {
    const existing = this.store.get(taskId);
    if (!existing) throw AppError.notFound(`Video task ${taskId} was not found`);
    if (existing.status === 'succeeded' || existing.status === 'failed') return existing;

    const refreshed =
      existing.provider === 'runway'
        ? await this.pollRunway(existing)
        : await this.pollLuma(existing);

    return this.store.save(refreshed);
  }

  async handleWebhook(payload: ProviderWebhookPayload): Promise<VideoGenerationTask | null> {
    const providerTaskId = this.extractProviderId(payload.provider, payload.raw);
    if (!providerTaskId) {
      logger.warn({ payload }, 'Webhook missing provider task id');
      return null;
    }

    const existing = this.store.getByProviderId(payload.provider, providerTaskId);
    if (!existing) {
      logger.warn({ providerTaskId, provider: payload.provider }, 'Webhook for unknown task');
      return null;
    }

    const mapped = this.mapFromWebhook(existing, payload);
    logger.info({ taskId: existing.taskId, status: mapped.status }, 'Applied video webhook');
    return this.store.save(mapped);
  }

  private async createRunwayTask(
    input: GenerateVideoInput,
    statusUrl: string,
  ): Promise<RunwayCreateResponse> {
    const model = input.model ?? env.RUNWAY_MODEL;
    const duration = input.durationSeconds ?? 5;
    const ratio = this.toRunwayRatio(input.aspectRatio);
    const body = input.imageUrl
      ? {
          model,
          promptText: input.prompt,
          promptImage: input.imageUrl,
          duration,
          ratio,
        }
      : {
          model,
          promptText: input.prompt,
          duration,
          ratio,
        };

    const path = input.imageUrl ? 'image_to_video' : 'text_to_video';
    return fetchJson<RunwayCreateResponse>(`${RUNWAY_BASE}/${path}`, {
      method: 'POST',
      headers: this.runwayHeaders(),
      body,
      timeoutMs: 30_000,
    }).catch((error) => {
      logger.error({ err: error, statusUrl, model }, 'Runway create failed');
      throw error;
    });
  }

  private async createLumaTask(
    input: GenerateVideoInput,
    statusUrl: string,
  ): Promise<LumaGenerationResponse> {
    const duration = `${input.durationSeconds ?? 5}s`;
    const body: Record<string, unknown> = {
      prompt: input.prompt,
      model: input.model ?? env.LUMA_MODEL,
      aspect_ratio: input.aspectRatio ?? '16:9',
      duration,
      callback_url: input.webhookUrl ?? `${env.PUBLIC_BASE_URL}/api/v1/generate-video/webhooks/luma`,
    };
    if (input.imageUrl) {
      body.keyframes = { frame0: { type: 'image', url: input.imageUrl } };
    }

    return fetchJson<LumaGenerationResponse>(`${LUMA_BASE}/generations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.LUMA_API_KEY}` },
      body,
      timeoutMs: 30_000,
    }).catch((error) => {
      logger.error({ err: error, statusUrl }, 'Luma create failed');
      throw error;
    });
  }

  private async pollRunway(task: VideoGenerationTask): Promise<VideoGenerationTask> {
    const remote = await fetchJson<RunwayTaskResponse>(`${RUNWAY_BASE}/tasks/${task.providerTaskId}`, {
      headers: this.runwayHeaders(),
    });
    const output = Array.isArray(remote.output) ? remote.output[0] : remote.output;
    return {
      ...task,
      status: this.mapRunwayStatus(remote.status),
      progress: typeof remote.progress === 'number' ? remote.progress : task.progress,
      outputUrl: output ?? task.outputUrl,
      error: remote.failure ?? remote.error ?? task.error,
      updatedAt: new Date().toISOString(),
    };
  }

  private async pollLuma(task: VideoGenerationTask): Promise<VideoGenerationTask> {
    const remote = await fetchJson<LumaGenerationResponse>(
      `${LUMA_BASE}/generations/${task.providerTaskId}`,
      { headers: { Authorization: `Bearer ${env.LUMA_API_KEY}` } },
    );
    const state = remote.state ?? remote.status;
    return {
      ...task,
      status: this.mapLumaStatus(state),
      progress: this.lumaProgress(state),
      outputUrl: remote.assets?.video ?? task.outputUrl,
      error: remote.failure_reason ?? task.error,
      updatedAt: new Date().toISOString(),
    };
  }

  private mapFromWebhook(task: VideoGenerationTask, payload: ProviderWebhookPayload): VideoGenerationTask {
    if (payload.provider === 'runway') {
      const remote = payload.raw as RunwayTaskResponse;
      const output = Array.isArray(remote.output) ? remote.output[0] : remote.output;
      return {
        ...task,
        status: this.mapRunwayStatus(remote.status),
        progress: typeof remote.progress === 'number' ? remote.progress : task.progress,
        outputUrl: output ?? task.outputUrl,
        error: remote.failure ?? remote.error ?? task.error,
        updatedAt: new Date().toISOString(),
      };
    }

    const remote = payload.raw as LumaGenerationResponse;
    const state = remote.state ?? remote.status;
    return {
      ...task,
      status: this.mapLumaStatus(state),
      progress: this.lumaProgress(state),
      outputUrl: remote.assets?.video ?? task.outputUrl,
      error: remote.failure_reason ?? task.error,
      updatedAt: new Date().toISOString(),
    };
  }

  private extractProviderId(provider: VideoProvider, raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    if (typeof record.id === 'string') return record.id;
    if (provider === 'luma' && record.data && typeof record.data === 'object') {
      const nested = record.data as Record<string, unknown>;
      if (typeof nested.id === 'string') return nested.id;
    }
    return null;
  }

  private runwayHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${env.RUNWAYML_API_KEY}`,
      'X-Runway-Version': env.RUNWAY_VERSION,
    };
  }

  private toRunwayRatio(aspectRatio?: string): string {
    switch (aspectRatio) {
      case '9:16':
        return '720:1280';
      case '1:1':
        return '960:960';
      case '16:9':
      default:
        return '1280:720';
    }
  }

  private mapRunwayStatus(status?: string): VideoTaskStatus {
    switch ((status ?? '').toUpperCase()) {
      case 'SUCCEEDED':
      case 'COMPLETED':
        return 'succeeded';
      case 'FAILED':
      case 'CANCELLED':
        return 'failed';
      case 'PENDING':
      case 'THROTTLED':
        return 'queued';
      default:
        return 'processing';
    }
  }

  private mapLumaStatus(status?: string): VideoTaskStatus {
    switch ((status ?? '').toLowerCase()) {
      case 'completed':
        return 'succeeded';
      case 'failed':
        return 'failed';
      case 'queued':
      case 'pending':
        return 'queued';
      default:
        return 'processing';
    }
  }

  private lumaProgress(status?: string): number {
    switch ((status ?? '').toLowerCase()) {
      case 'completed':
        return 1;
      case 'dreaming':
      case 'processing':
        return 0.6;
      case 'queued':
      case 'pending':
        return 0.1;
      default:
        return 0.3;
    }
  }
}
