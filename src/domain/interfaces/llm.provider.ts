export interface LlmCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmCompletionResult<T = unknown> {
  text: string;
  parsed?: T;
  provider: string;
  model: string;
  tokensUsed?: number;
  fallbackUsed?: boolean;
  notes?: string;
}

export interface LlmProviderInfo {
  id: string;
  displayName: string;
  isFreeTier: boolean;
  isConfigured: boolean;
  missingConfigReason?: string | null;
  defaultModel: string;
  websiteUrl: string;
  setupInstructions: string;
}

export interface ILlmProvider {
  readonly id: string;
  readonly displayName: string;
  readonly isFreeTier: boolean;
  isConfigured(): boolean;
  getMissingConfigReason(): string | null;
  getInfo(): LlmProviderInfo;
  completeJson<T = unknown>(
    systemPrompt: string,
    userPrompt: string,
    options?: LlmCompletionOptions,
  ): Promise<LlmCompletionResult<T>>;
}
