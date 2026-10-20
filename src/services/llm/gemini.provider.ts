import { env } from '../../config/env.js';
import { AppError } from '../../domain/errors/app-error.js';
import type { ILlmProvider, LlmCompletionOptions, LlmCompletionResult, LlmProviderInfo } from '../../domain/interfaces/llm.provider.js';
import { extractJsonObject } from '../../utils/json.js';
import { logger } from '../../utils/logger.js';

export class GeminiLlmProvider implements ILlmProvider {
  readonly id = 'gemini';
  readonly displayName = 'Google Gemini (Free Tier)';
  readonly isFreeTier = true;

  isConfigured(): boolean {
    return Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0);
  }

  getMissingConfigReason(): string | null {
    if (this.isConfigured()) return null;
    return 'GEMINI_API_KEY is not set. Get a free API key at https://aistudio.google.com';
  }

  getInfo(): LlmProviderInfo {
    return {
      id: this.id,
      displayName: this.displayName,
      isFreeTier: this.isFreeTier,
      isConfigured: this.isConfigured(),
      missingConfigReason: this.getMissingConfigReason(),
      defaultModel: env.GEMINI_MODEL,
      websiteUrl: 'https://aistudio.google.com',
      setupInstructions: '1. Visit https://aistudio.google.com\n2. Click "Get API key"\n3. Create an API key (no credit card needed)\n4. Set GEMINI_API_KEY in your .env file.',
    };
  }

  async completeJson<T = unknown>(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmCompletionOptions,
  ): Promise<LlmCompletionResult<T>> {
    if (!this.isConfigured()) {
      throw AppError.upstream(`Gemini provider is not configured: ${this.getMissingConfigReason()}`);
    }

    const model = options?.model ?? env.GEMINI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

    logger.info({ provider: this.id, model }, 'Calling Google Gemini API');

    const body = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        response_mime_type: 'application/json',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error({ status: res.status, errText }, 'Gemini API call failed');
      throw AppError.upstream(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
      usageMetadata?: { totalTokenCount?: number };
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    if (!text) {
      throw AppError.upstream('Gemini API returned an empty response');
    }

    let parsed: T | undefined;
    try {
      parsed = extractJsonObject(text) as T;
    } catch {
      // Return raw text if not valid JSON
    }

    return {
      text,
      parsed,
      provider: this.id,
      model,
      tokensUsed: data.usageMetadata?.totalTokenCount,
    };
  }
}
