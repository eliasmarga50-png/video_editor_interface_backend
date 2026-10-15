import type { Request, Response } from 'express';
import { brollExtractorService } from '../container.js';
import type { brollKeywordsSchema } from '../dto/requests.js';
import { sendSuccess } from '../http/response.js';
import type { z } from 'zod';

type BrollBody = z.infer<typeof brollKeywordsSchema>;

export async function brollKeywordsController(req: Request, res: Response): Promise<void> {
  const body = req.body as BrollBody;
  const result = await brollExtractorService.extract(body.transcript, {
    language: body.language,
    maxScenes: body.maxScenes,
  });
  sendSuccess(res, result);
}
