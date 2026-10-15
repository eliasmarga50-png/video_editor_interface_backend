import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { AppError } from '../domain/errors/app-error.js';
import { logger } from '../utils/logger.js';

export type LlmProvider = 'anthropic' | 'openai';

export class LlmClient {
  private readonly anthropic: Anthropic;
  private readonly openai: OpenAI;

  constructor() {
    this.anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  get openaiClient(): OpenAI {
    return this.openai;
  }

  async completeJson(system: string, user: string, provider: LlmProvider = env.LLM_PROVIDER): Promise<{
    text: string;
    provider: LlmProvider;
  }> {
    try {
      if (provider === 'anthropic') {
        const response = await this.anthropic.messages.create({
          model: env.ANTHROPIC_MODEL,
          max_tokens: 4096,
          temperature: 0.2,
          system,
          messages: [{ role: 'user', content: user }],
        });
        const text = response.content
          .filter((block) => block.type === 'text')
          .map((block) => (block.type === 'text' ? block.text : ''))
          .join('\n')
          .trim();
        if (!text) throw AppError.upstream('Empty response from Anthropic');
        return { text, provider };
      }

      const response = await this.openai.chat.completions.create({
        model: env.OPENAI_CHAT_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      });
      const text = response.choices[0]?.message?.content?.trim();
      if (!text) throw AppError.upstream('Empty response from OpenAI');
      return { text, provider };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error({ err: error, provider }, 'LLM completion failed');
      throw AppError.upstream('Language model request failed', error);
    }
  }
}
