import { env } from '../../config/env.js';
import type {
  ILlmProvider,
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmProviderInfo,
} from '../../domain/interfaces/llm.provider.js';
import { logger } from '../../utils/logger.js';
import { AnthropicLlmProvider } from './anthropic.provider.js';
import { DevelopmentLlmProvider } from './development.provider.js';
import { GeminiLlmProvider } from './gemini.provider.js';
import { GroqLlmProvider } from './groq.provider.js';
import { OllamaLlmProvider } from './ollama.provider.js';
import { OpenAiLlmProvider } from './openai.provider.js';

export class LlmService {
  private readonly providers = new Map<string, ILlmProvider>();
  private readonly fallbackProvider: ILlmProvider;

  constructor() {
    this.fallbackProvider = new DevelopmentLlmProvider();

    this.register(new GeminiLlmProvider());
    this.register(new GroqLlmProvider());
    this.register(new OllamaLlmProvider());
    this.register(new OpenAiLlmProvider());
    this.register(new AnthropicLlmProvider());
    this.register(this.fallbackProvider);
  }

  private register(provider: ILlmProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(providerId?: string): ILlmProvider {
    const id = providerId ?? env.LLM_PROVIDER;
    const provider = this.providers.get(id);

    if (provider && provider.isConfigured()) {
      return provider;
    }

    // Try finding another configured provider
    for (const p of this.providers.values()) {
      if (p.id !== 'development' && p.isConfigured()) {
        logger.info(
          { requested: id, selected: p.id },
          'Requested provider not configured; using available configured provider',
        );
        return p;
      }
    }

    // Fall back to development provider
    logger.warn(
      { requested: id, reason: provider?.getMissingConfigReason() },
      'No cloud LLM keys configured; falling back to Development Heuristic Planner',
    );
    return this.fallbackProvider;
  }

  listProviders(): LlmProviderInfo[] {
    return Array.from(this.providers.values()).map((p) => p.getInfo());
  }

  async completeJson<T = unknown>(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmCompletionOptions & { provider?: string },
  ): Promise<LlmCompletionResult<T>> {
    const provider = this.getProvider(options?.provider);

    try {
      return await provider.completeJson<T>(systemPrompt, userPrompt, options);
    } catch (err) {
      if (provider.id !== 'development') {
        logger.warn(
          { err, provider: provider.id },
          'Provider failed; retrying with Development Heuristic Planner fallback',
        );
        const fallbackResult = await this.fallbackProvider.completeJson<T>(
          systemPrompt,
          userPrompt,
          options,
        );
        return {
          ...fallbackResult,
          fallbackUsed: true,
          notes: `Upstream error with ${provider.displayName}: ${(err as Error).message}. Fell back to development planner.`,
        };
      }
      throw err;
    }
  }
}
