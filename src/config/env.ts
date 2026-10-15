import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default('0.0.0.0'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:8080'),
  CORS_ORIGIN: z.string().default('*'),

  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  RUNWAYML_API_KEY: z.string().min(1, 'RUNWAYML_API_KEY is required'),
  LUMA_API_KEY: z.string().min(1, 'LUMA_API_KEY is required'),

  LLM_PROVIDER: z.enum(['anthropic', 'openai']).default('anthropic'),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-sonnet-latest'),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o'),
  WHISPER_MODEL: z.string().default('whisper-1'),

  RUNWAY_MODEL: z.string().default('gen4.5'),
  RUNWAY_VERSION: z.string().default('2024-11-06'),
  LUMA_MODEL: z.string().default('ray-2'),
  VIDEO_TASK_TTL_MS: z.coerce.number().int().positive().default(86_400_000),

  MAX_UPLOAD_MB: z.coerce.number().positive().default(64),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    const message = Object.entries(details)
      .map(([key, value]) => `${key}: ${value?.join(', ')}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${message}`);
  }
  return parsed.data;
}

export const env = parseEnv();
