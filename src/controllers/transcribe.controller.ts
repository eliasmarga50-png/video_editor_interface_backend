import type { Request, Response } from 'express';
import { ETHIOPIAN_LANGUAGES } from '../domain/interfaces/translation.js';
import { AppError } from '../domain/errors/app-error.js';
import type { transcribeQuerySchema } from '../dto/requests.js';
import { sendSuccess } from '../http/response.js';
import { translationService, whisperService } from '../container.js';
import { safeUnlink } from '../utils/files.js';
import { logger } from '../utils/logger.js';
import type { z } from 'zod';

type TranscribeQuery = z.infer<typeof transcribeQuerySchema>;

export async function transcribeController(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw AppError.badRequest('A media file field named "file" is required');

  const query = req.query as unknown as TranscribeQuery;

  try {
    const transcript = await whisperService.transcribe(file.path, file.mimetype, {
      language: query.language,
      prompt: query.prompt,
    });

    const detected = (transcript.language ?? '').toLowerCase();
    const ethiopian =
      ETHIOPIAN_LANGUAGES.includes(detected as (typeof ETHIOPIAN_LANGUAGES)[number]) ||
      ['amharic', 'oromo', 'afaan oromoo', 'tigrinya', 'tigrigna'].includes(detected);
    const shouldTranslate = query.translate === true || ethiopian;

    const translation = shouldTranslate
      ? await translationService.cleanAndTranslate(transcript.text, {
          sourceLanguage: (query.language as 'am' | 'om' | 'ti' | 'en' | 'auto') ?? 'auto',
          targetLanguage: query.targetLanguage ?? 'en',
        })
      : null;

    sendSuccess(res, {
      ...transcript,
      translation,
    });
  } catch (error) {
    logger.error({ err: error, originalName: file.originalname }, 'Transcribe controller failed');
    throw error;
  } finally {
    await safeUnlink(file.path);
  }
}
