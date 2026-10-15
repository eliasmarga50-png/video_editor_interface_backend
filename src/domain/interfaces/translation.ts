export const ETHIOPIAN_LANGUAGES = ['am', 'om', 'ti', 'amh', 'orm', 'tir'] as const;

export type SupportedLanguage = 'am' | 'om' | 'ti' | 'en' | 'auto';

export interface TranslationResult {
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  cleanedText: string;
  translatedText: string;
  provider: 'anthropic' | 'openai';
}

export interface TranslateOptions {
  sourceLanguage?: SupportedLanguage;
  targetLanguage?: string;
}

export interface ITranslationService {
  cleanAndTranslate(text: string, options?: TranslateOptions): Promise<TranslationResult>;
}
