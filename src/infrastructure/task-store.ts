import type { VideoGenerationTask } from '../domain/interfaces/video-generation.js';
import { env } from '../config/env.js';

export class InMemoryTaskStore {
  private readonly tasks = new Map<string, VideoGenerationTask>();
  private readonly byProviderId = new Map<string, string>();

  save(task: VideoGenerationTask): VideoGenerationTask {
    this.tasks.set(task.taskId, task);
    this.byProviderId.set(`${task.provider}:${task.providerTaskId}`, task.taskId);
    this.prune();
    return task;
  }

  get(taskId: string): VideoGenerationTask | undefined {
    return this.tasks.get(taskId);
  }

  getByProviderId(provider: string, providerTaskId: string): VideoGenerationTask | undefined {
    const taskId = this.byProviderId.get(`${provider}:${providerTaskId}`);
    return taskId ? this.tasks.get(taskId) : undefined;
  }

  private prune(): void {
    const cutoff = Date.now() - env.VIDEO_TASK_TTL_MS;
    for (const [id, task] of this.tasks) {
      if (Date.parse(task.createdAt) < cutoff) {
        this.tasks.delete(id);
        this.byProviderId.delete(`${task.provider}:${task.providerTaskId}`);
      }
    }
  }
}
