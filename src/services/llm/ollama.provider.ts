import { env } from '../../config/env.js';
import { AppError } from '../../domain/errors/app-error.js';
import type { ILlmProvider, LlmCompletionOptions, LlmCompletionResult, LlmProviderInfo } from '../../domain/interfaces/llm.provider.js';
import { extractJsonObject } from '../../utils/json.js';
import { logger } from '../../utils/logger.js';

export class OllamaLlmProvider implements ILlmProvider {
  readonly id = 'ollama';
  readonly displayName = 'Ollama (Local, Free, Private)';
  readonly isFreeTier = true;

  isConfigured(): boolean {
    return Boolean(env.OLLAMA_BASE_URL && env.OLLAMA_BASE_URL.trim().length > 0);
  }

  getMissingConfigReason(): string | null {
    if (this.isConfigured()) return null;
    return 'OLLAMA_BASE_URL is not configured';
  }

  getInfo(): LlmProviderInfo {
    return {
      id: this.id,
      displayName: this.displayName,
      isFreeTier: this.isFreeTier,
      isConfigured: this.isConfigured(),
      missingConfigReason: this.getMissingConfigReason(),
      defaultModel: 'llama3.2',
      websiteUrl: 'https://ollama.ai',
      setupInstructions: '1. Install Ollama from https://ollama.ai\n2. Run `ollama run llama3.2`\n3. Set LLM_PROVIDER=ollama in your .env file.',
    };
  }

  async completeJson<T = unknown>(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmCompletionOptions,
  ): Promise<LlmCompletionResult<T>> {
    const model = options?.model ?? 'llama3.2';
    const baseUrl = env.OLLAMA_BASE_URL.replace(/\/+$/, '');
    logger.info({ provider: this.id, model, baseUrl }, 'Calling Ollama API');

    try {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        logger.error({ status: res.status, errText }, 'Ollama API call failed');
        throw AppError.upstream(`Ollama API error (${res.status}): ${errText}`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { total_tokens?: number };
      };

      const text = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (!text) {
        throw AppError.upstream('Ollama returned an empty response');
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
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      throw AppError.upstream(
        `Failed to reach local Ollama at ${baseUrl}. Ensure Ollama is running ('ollama serve') or switch to another provider like Gemini or Groq.`,
        err,
      );
    }
  }
}
