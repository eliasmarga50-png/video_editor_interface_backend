import type { Request, Response } from 'express';
import { videoGenService } from '../container.js';
import type { generateVideoSchema, taskIdParamsSchema, webhookProviderParamsSchema } from '../dto/requests.js';
import { sendSuccess } from '../http/response.js';
import { logger } from '../utils/logger.js';
import type { z } from 'zod';

type GenerateBody = z.infer<typeof generateVideoSchema>;
type TaskParams = z.infer<typeof taskIdParamsSchema>;
type WebhookParams = z.infer<typeof webhookProviderParamsSchema>;

export async function createVideoController(req: Request, res: Response): Promise<void> {
  const body = req.body as GenerateBody;
  const task = await videoGenService.createTask(body);
  sendSuccess(
    res,
    {
      taskId: task.taskId,
      status: task.status,
      provider: task.provider,
      statusUrl: task.statusUrl,
    },
    202,
  );
}

export async function getVideoTaskController(req: Request, res: Response): Promise<void> {
  const { taskId } = req.params as unknown as TaskParams;
  const task = await videoGenService.getTask(taskId);
  sendSuccess(res, {
    taskId: task.taskId,
    status: task.status,
    progress: task.progress,
    provider: task.provider,
    model: task.model,
    outputUrl: task.outputUrl,
    error: task.error,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  });
}

export async function videoWebhookController(req: Request, res: Response): Promise<void> {
  const { provider } = req.params as unknown as WebhookParams;
  logger.info({ provider, body: req.body }, 'Received video generation webhook');
  const task = await videoGenService.handleWebhook({ provider, raw: req.body });
  sendSuccess(res, { accepted: true, taskId: task?.taskId ?? null });
}
