import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { env } from '../config/env.js';
import { LlmService } from './llm/llm.service.js';

export type LlmProvider = string;

export class LlmClient {
  private _anthropic: Anthropic | null = null;
  private _openai: OpenAI | null = null;
  private readonly service: LlmService;

  constructor(service?: LlmService) {
    this.service = service ?? new LlmService();
  }

  get openaiClient(): OpenAI {
    if (!this._openai) {
      this._openai = new OpenAI({ apiKey: env.OPENAI_API_KEY || 'dummy-key' });
    }
    return this._openai;
  }

  get anthropicClient(): Anthropic {
    if (!this._anthropic) {
      this._anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY || 'dummy-key' });
    }
    return this._anthropic;
  }

  get llmService(): LlmService {
    return this.service;
  }

  async completeJson(
    system: string,
    user: string,
    provider?: string,
  ): Promise<{
    text: string;
    provider: string;
  }> {
    const result = await this.service.completeJson(system, user, { provider });
    return {
      text: result.text,
      provider: result.provider,
    };
  }
}
