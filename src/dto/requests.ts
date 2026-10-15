import { z } from 'zod';

export const transcribeQuerySchema = z.object({
  language: z.string().min(2).max(16).optional(),
  translate: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((value) => value === true || value === 'true'),
  targetLanguage: z.string().min(2).max(16).optional(),
  prompt: z.string().max(1000).optional(),
});

export const brollKeywordsSchema = z.object({
  transcript: z.string().min(1, 'transcript is required').max(50_000),
  language: z.string().min(2).max(16).optional(),
  maxScenes: z.number().int().min(1).max(20).optional(),
});

export const generateVideoSchema = z.object({
  prompt: z.string().min(1).max(2000),
  provider: z.enum(['runway', 'luma']),
  durationSeconds: z.number().int().min(2).max(10).optional(),
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3', '3:4']).optional(),
  imageUrl: z.string().url().optional(),
  model: z.string().min(1).max(64).optional(),
  webhookUrl: z.string().url().optional(),
});

export const taskIdParamsSchema = z.object({
  taskId: z.string().uuid(),
});

export const webhookProviderParamsSchema = z.object({
  provider: z.enum(['runway', 'luma']),
});
