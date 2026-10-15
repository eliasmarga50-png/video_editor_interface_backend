import { Router } from 'express';
import { transcribeController } from '../../controllers/transcribe.controller.js';
import { transcribeQuerySchema } from '../../dto/requests.js';
import { mediaUpload } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';

export const transcribeRouter = Router();

transcribeRouter.post(
  '/',
  mediaUpload.single('file'),
  validate(transcribeQuerySchema, 'query'),
  asyncHandler(transcribeController),
);
