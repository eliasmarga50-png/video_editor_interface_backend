import { env } from '../../config/env.js';
import { AppError } from '../../domain/errors/app-error.js';
import type { ILlmProvider, LlmCompletionOptions, LlmCompletionResult, LlmProviderInfo } from '../../domain/interfaces/llm.provider.js';
import { extractJsonObject } from '../../utils/json.js';
import { logger } from '../../utils/logger.js';

export class GroqLlmProvider implements ILlmProvider {
  readonly id = 'groq';
  readonly displayName = 'Groq Cloud (Free Tier)';
  readonly isFreeTier = true;

  isConfigured(): boolean {
    return Boolean(env.GROQ_API_KEY && env.GROQ_API_KEY.trim().length > 0);
  }

  getMissingConfigReason(): string | null {
    if (this.isConfigured()) return null;
    return 'GROQ_API_KEY is not set. Get a free API key at https://console.groq.com';
  }

  getInfo(): LlmProviderInfo {
    return {
      id: this.id,
      displayName: this.displayName,
      isFreeTier: this.isFreeTier,
      isConfigured: this.isConfigured(),
      missingConfigReason: this.getMissingConfigReason(),
      defaultModel: env.GROQ_MODEL,
      websiteUrl: 'https://console.groq.com',
      setupInstructions: '1. Visit https://console.groq.com\n2. Create a free account\n3. Generate an API Key under Keys\n4. Set GROQ_API_KEY in your .env file.',
    };
  }

  async completeJson<T = unknown>(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmCompletionOptions,
  ): Promise<LlmCompletionResult<T>> {
    if (!this.isConfigured()) {
      throw AppError.upstream(`Groq provider is not configured: ${this.getMissingConfigReason()}`);
    }

    const model = options?.model ?? env.GROQ_MODEL;
    logger.info({ provider: this.id, model }, 'Calling Groq API');

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: options?.temperature ?? 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.error({ status: res.status, errText }, 'Groq API call failed');
      throw AppError.upstream(`Groq API error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!text) {
      throw AppError.upstream('Groq API returned an empty response');
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
      tokensUsed: data.usage?.total_tokens,
    };
  }
}
