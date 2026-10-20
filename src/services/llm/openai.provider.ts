import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { AppError } from '../../domain/errors/app-error.js';
import type { ILlmProvider, LlmCompletionOptions, LlmCompletionResult, LlmProviderInfo } from '../../domain/interfaces/llm.provider.js';
import { extractJsonObject } from '../../utils/json.js';
import { logger } from '../../utils/logger.js';

export class OpenAiLlmProvider implements ILlmProvider {
  readonly id = 'openai';
  readonly displayName = 'OpenAI (Paid/Credits)';
  readonly isFreeTier = false;

  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      if (!this.isConfigured()) {
        throw AppError.upstream(`OpenAI provider is not configured: ${this.getMissingConfigReason()}`);
      }
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return Boolean(env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim().length > 0);
  }

  getMissingConfigReason(): string | null {
    if (this.isConfigured()) return null;
    return 'OPENAI_API_KEY is not set. Get an API key from https://platform.openai.com';
  }

  getInfo(): LlmProviderInfo {
    return {
      id: this.id,
      displayName: this.displayName,
      isFreeTier: this.isFreeTier,
      isConfigured: this.isConfigured(),
      missingConfigReason: this.getMissingConfigReason(),
      defaultModel: env.OPENAI_CHAT_MODEL,
      websiteUrl: 'https://platform.openai.com',
      setupInstructions: '1. Visit https://platform.openai.com\n2. Add billing/credits\n3. Generate an API Key under API Keys\n4. Set OPENAI_API_KEY in your .env file.',
    };
  }

  async completeJson<T = unknown>(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmCompletionOptions,
  ): Promise<LlmCompletionResult<T>> {
    const model = options?.model ?? env.OPENAI_CHAT_MODEL;
    logger.info({ provider: this.id, model }, 'Calling OpenAI API');

    try {
      const client = this.getClient();
      const response = await client.chat.completions.create({
        model,
        temperature: options?.temperature ?? 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const text = response.choices[0]?.message?.content?.trim() ?? '';
      if (!text) {
        throw AppError.upstream('Empty response from OpenAI');
      }

      let parsed: T | undefined;
      try {
        parsed = extractJsonObject(text) as T;
      } catch {
        // Return raw
      }

      return {
        text,
        parsed,
        provider: this.id,
        model,
        tokensUsed: response.usage?.total_tokens,
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, 'OpenAI API completion failed');
      throw AppError.upstream('OpenAI request failed', err);
    }
  }
}
