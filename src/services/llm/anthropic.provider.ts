import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { AppError } from '../../domain/errors/app-error.js';
import type { ILlmProvider, LlmCompletionOptions, LlmCompletionResult, LlmProviderInfo } from '../../domain/interfaces/llm.provider.js';
import { extractJsonObject } from '../../utils/json.js';
import { logger } from '../../utils/logger.js';

export class AnthropicLlmProvider implements ILlmProvider {
  readonly id = 'anthropic';
  readonly displayName = 'Anthropic Claude (Paid/Credits)';
  readonly isFreeTier = false;

  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      if (!this.isConfigured()) {
        throw AppError.upstream(`Anthropic provider is not configured: ${this.getMissingConfigReason()}`);
      }
      this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  isConfigured(): boolean {
    return Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim().length > 0);
  }

  getMissingConfigReason(): string | null {
    if (this.isConfigured()) return null;
    return 'ANTHROPIC_API_KEY is not set. Get an API key from https://console.anthropic.com';
  }

  getInfo(): LlmProviderInfo {
    return {
      id: this.id,
      displayName: this.displayName,
      isFreeTier: this.isFreeTier,
      isConfigured: this.isConfigured(),
      missingConfigReason: this.getMissingConfigReason(),
      defaultModel: env.ANTHROPIC_MODEL,
      websiteUrl: 'https://console.anthropic.com',
      setupInstructions: '1. Visit https://console.anthropic.com\n2. Add billing/credits\n3. Generate an API Key\n4. Set ANTHROPIC_API_KEY in your .env file.',
    };
  }

  async completeJson<T = unknown>(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmCompletionOptions,
  ): Promise<LlmCompletionResult<T>> {
    const model = options?.model ?? env.ANTHROPIC_MODEL;
    logger.info({ provider: this.id, model }, 'Calling Anthropic Claude API');

    try {
      const client = this.getClient();
      const response = await client.messages.create({
        model,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.2,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block.type === 'text' ? block.text : ''))
        .join('\n')
        .trim();

      if (!text) {
        throw AppError.upstream('Empty response from Anthropic Claude');
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
        tokensUsed: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
      };
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, 'Anthropic API completion failed');
      throw AppError.upstream('Anthropic request failed', err);
    }
  }
}
