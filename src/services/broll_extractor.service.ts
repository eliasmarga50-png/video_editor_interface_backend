import { z } from 'zod';
import { AppError } from '../domain/errors/app-error.js';
import type {
  BrollExtractOptions,
  BrollExtractionResult,
  IBrollExtractorService,
} from '../domain/interfaces/broll.js';
import { extractJsonObject } from '../utils/json.js';
import { logger } from '../utils/logger.js';
import type { LlmClient } from './llm.client.js';

const sceneSchema = z.object({
  sceneIndex: z.number().int().nonnegative(),
  concept: z.string().min(1),
  visualPrompt: z.string().min(1),
  stockKeywords: z.array(z.string().min(1)).min(1),
  mood: z.string().min(1),
  startHintMs: z.number().int().nonnegative().nullable().default(null),
  endHintMs: z.number().int().nonnegative().nullable().default(null),
});

const brollSchema = z.object({
  summary: z.string().min(1),
  scenes: z.array(sceneSchema).min(1),
});

export class BrollExtractorService implements IBrollExtractorService {
  constructor(private readonly llm: LlmClient) {}

  async extract(transcript: string, options: BrollExtractOptions = {}): Promise<BrollExtractionResult> {
    const text = transcript.trim();
    if (!text) throw AppError.badRequest('Transcript text is required');

    const maxScenes = options.maxScenes ?? 8;

    const system = [
      'You are a senior documentary editor extracting B-roll search terms for CineAI.',
      'Turn spoken transcript into precise visual scene concepts and stock-footage keywords.',
      'Prefer concrete, filmable imagery over abstract metaphors.',
      'visualPrompt must be a camera-ready description suitable for Gen-3 / Luma / stock search.',
      'stockKeywords must be short English search phrases (2-5 words).',
      'Return ONLY valid JSON: { summary: string, scenes: Scene[] }.',
      'Scene keys: sceneIndex, concept, visualPrompt, stockKeywords, mood, startHintMs, endHintMs.',
    ].join(' ');

    const user = JSON.stringify({
      language: options.language ?? 'auto',
      maxScenes,
      transcript: text,
    });

    logger.info({ chars: text.length, maxScenes }, 'Extracting B-roll keywords');

    const { text: raw, provider } = await this.llm.completeJson(system, user);
    const parsed = brollSchema.safeParse(extractJsonObject(raw));
    if (!parsed.success) {
      throw AppError.upstream('B-roll extractor returned invalid JSON', parsed.error.flatten());
    }

    return {
      summary: parsed.data.summary,
      scenes: parsed.data.scenes.slice(0, maxScenes),
      provider,
    };
  }
}
