import { Router } from 'express';
import {
  createVideoController,
  getVideoTaskController,
  videoWebhookController,
} from '../../controllers/video-gen.controller.js';
import {
  generateVideoSchema,
  taskIdParamsSchema,
  webhookProviderParamsSchema,
} from '../../dto/requests.js';
import { generationRateLimiter } from '../../middleware/rate-limit.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';

export const videoGenRouter = Router();

videoGenRouter.post(
  '/',
  generationRateLimiter,
  validate(generateVideoSchema),
  asyncHandler(createVideoController),
);

videoGenRouter.get(
  '/:taskId',
  validate(taskIdParamsSchema, 'params'),
  asyncHandler(getVideoTaskController),
);

videoGenRouter.post(
  '/webhooks/:provider',
  validate(webhookProviderParamsSchema, 'params'),
  asyncHandler(videoWebhookController),
);
