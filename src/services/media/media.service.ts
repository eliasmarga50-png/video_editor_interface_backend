import { env } from '../../config/env.js';
import type {
  IMediaProvider,
  MediaGenerationInput,
  MediaGenerationResult,
  MediaProviderInfo,
} from '../../domain/interfaces/media.provider.js';
import { logger } from '../../utils/logger.js';
import { LocalMediaProvider } from './local.media.provider.js';
import { PexelsMediaProvider } from './pexels.media.provider.js';
import { PollinationsMediaProvider } from './pollinations.media.provider.js';

export class MediaService {
  private readonly providers = new Map<string, IMediaProvider>();
  private readonly fallbackProvider: IMediaProvider;

  constructor() {
    this.fallbackProvider = new LocalMediaProvider();

    this.register(new PollinationsMediaProvider());
    this.register(new PexelsMediaProvider());
    this.register(this.fallbackProvider);
  }

  private register(provider: IMediaProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(providerId?: string): IMediaProvider {
    const id = providerId ?? env.VIDEO_PROVIDER;
    const provider = this.providers.get(id);

    if (provider && provider.isConfigured()) {
      return provider;
    }

    // If configured provider isn't available, check for any configured free tier
    for (const p of this.providers.values()) {
      if (p.isConfigured() && p.id !== 'local') {
        return p;
      }
    }

    return this.fallbackProvider;
  }

  listProviders(): MediaProviderInfo[] {
    const list = Array.from(this.providers.values()).map((p) => p.getInfo());

    // Also include Runway and Luma info for clear setup documentation
    list.push({
      id: 'runway',
      displayName: 'Runway ML (Gen-4.5 / Gen-3 Alpha)',
      isFreeTier: false,
      isConfigured: Boolean(env.RUNWAYML_API_KEY && env.RUNWAYML_API_KEY.length > 0),
      missingConfigReason: env.RUNWAYML_API_KEY ? null : 'RUNWAYML_API_KEY is not set',
      limitations: 'High-fidelity commercial video generation. Requires paid credits.',
      websiteUrl: 'https://runwayml.com',
      setupInstructions: '1. Visit https://runwayml.com\n2. Create developer account\n3. Generate secret key\n4. Set RUNWAYML_API_KEY in .env file.',
    });

    list.push({
      id: 'luma',
      displayName: 'Luma Dream Machine (Ray-2)',
      isFreeTier: false,
      isConfigured: Boolean(env.LUMA_API_KEY && env.LUMA_API_KEY.length > 0),
      missingConfigReason: env.LUMA_API_KEY ? null : 'LUMA_API_KEY is not set',
      limitations: 'Photorealistic commercial video generation with camera keyframes. Requires paid credits.',
      websiteUrl: 'https://lumalabs.ai/dream-machine/api',
      setupInstructions: '1. Visit https://lumalabs.ai\n2. Access Dream Machine API\n3. Generate API Key\n4. Set LUMA_API_KEY in .env file.',
    });

    return list;
  }

  async generateVideo(input: MediaGenerationInput, providerId?: string): Promise<MediaGenerationResult> {
    const provider = this.getProvider(providerId);
    logger.info({ provider: provider.id, prompt: input.prompt }, 'Executing media generation');

    try {
      return await provider.generateVideo(input);
    } catch (err) {
      if (provider.id !== 'local') {
        logger.warn(
          { err, provider: provider.id },
          'Selected media provider failed; falling back to Local Media Synthesizer',
        );
        const fallbackResult = await this.fallbackProvider.generateVideo(input);
        return {
          ...fallbackResult,
          limitationsNotice: `Note: Primary provider '${provider.displayName}' encountered an error (${(err as Error).message}). Fell back to ${this.fallbackProvider.displayName}.`,
        };
      }
      throw err;
    }
  }
}
