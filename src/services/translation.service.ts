import { z } from 'zod';
import { AppError } from '../domain/errors/app-error.js';
import type {
  ITranslationService,
  TranslateOptions,
  TranslationResult,
} from '../domain/interfaces/translation.js';
import { extractJsonObject } from '../utils/json.js';
import { logger } from '../utils/logger.js';
import type { LlmClient } from './llm.client.js';

const translationSchema = z.object({
  sourceLanguage: z.string().min(2),
  targetLanguage: z.string().min(2),
  cleanedText: z.string(),
  translatedText: z.string(),
});

const LANGUAGE_HINTS: Record<string, string> = {
  am: 'Amharic',
  amh: 'Amharic',
  om: 'Afaan Oromoo',
  orm: 'Afaan Oromoo',
  ti: 'Tigrinya',
  tir: 'Tigrinya',
  en: 'English',
  auto: 'auto-detect (Amharic, Afaan Oromoo, Tigrinya, or English)',
};

export class TranslationService implements ITranslationService {
  constructor(private readonly llm: LlmClient) {}

  async cleanAndTranslate(text: string, options: TranslateOptions = {}): Promise<TranslationResult> {
    const originalText = text.trim();
    if (!originalText) throw AppError.badRequest('Transcript text is required');

    const source = options.sourceLanguage ?? 'auto';
    const target = options.targetLanguage ?? 'en';
    const sourceLabel = LANGUAGE_HINTS[source] ?? source;
    const targetLabel = LANGUAGE_HINTS[target] ?? target;

    const system = [
      'You are a professional Ethiopian-language post-production linguist.',
      'Clean filler, false starts, and transcription noise without changing meaning.',
      'Support Amharic, Afaan Oromoo (Oromo), Tigrinya, and English.',
      'Return ONLY valid JSON with keys: sourceLanguage, targetLanguage, cleanedText, translatedText.',
      'sourceLanguage and targetLanguage must be ISO-like codes: am, om, ti, or en.',
    ].join(' ');

    const user = JSON.stringify({
      sourceLanguageHint: sourceLabel,
      targetLanguage: targetLabel,
      text: originalText,
    });

    logger.info({ source, target, chars: originalText.length }, 'Starting translation/cleaning');

    const { text: raw, provider } = await this.llm.completeJson(system, user);
    const parsed = translationSchema.safeParse(extractJsonObject(raw));
    if (!parsed.success) {
      throw AppError.upstream('Translation model returned an invalid payload', parsed.error.flatten());
    }

    return {
      sourceLanguage: parsed.data.sourceLanguage,
      targetLanguage: parsed.data.targetLanguage,
      originalText,
      cleanedText: parsed.data.cleanedText,
      translatedText: parsed.data.translatedText,
      provider,
    };
  }
}
