import { env } from '../../config/env.js';
import { AppError } from '../../domain/errors/app-error.js';
import type {
  IMediaProvider,
  MediaClip,
  MediaGenerationInput,
  MediaGenerationResult,
  MediaProviderInfo,
} from '../../domain/interfaces/media.provider.js';
import { logger } from '../../utils/logger.js';

interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

interface PexelsVideoItem {
  id: number;
  width: number;
  height: number;
  duration: number;
  image: string;
  video_files: PexelsVideoFile[];
}

interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  videos: PexelsVideoItem[];
}

export class PexelsMediaProvider implements IMediaProvider {
  readonly id = 'pexels';
  readonly displayName = 'Pexels Video Engine (Free API Tier)';
  readonly isFreeTier = true;

  isConfigured(): boolean {
    return Boolean(env.PEXELS_API_KEY && env.PEXELS_API_KEY.trim().length > 0);
  }

  getMissingConfigReason(): string | null {
    if (this.isConfigured()) return null;
    return 'PEXELS_API_KEY is not set. Get a free API key at https://www.pexels.com/api';
  }

  getLimitations(): string {
    return 'Provides real curated HD video footage up to 200 requests/hour on the free tier. Clips are sourced from real footage based on scene keywords.';
  }

  getInfo(): MediaProviderInfo {
    return {
      id: this.id,
      displayName: this.displayName,
      isFreeTier: this.isFreeTier,
      isConfigured: this.isConfigured(),
      missingConfigReason: this.getMissingConfigReason(),
      limitations: this.getLimitations(),
      websiteUrl: 'https://www.pexels.com/api',
      setupInstructions: '1. Visit https://www.pexels.com/api\n2. Create a free account\n3. Click "Your API Key"\n4. Set PEXELS_API_KEY in your .env file.',
    };
  }

  async generateVideo(input: MediaGenerationInput): Promise<MediaGenerationResult> {
    if (!this.isConfigured()) {
      throw AppError.upstream(`Pexels provider is not configured: ${this.getMissingConfigReason()}`);
    }

    const durationSeconds = input.durationSeconds ?? 15;
    const aspectRatio = input.aspectRatio ?? '9:16';
    const orientation = aspectRatio === '9:16' ? 'portrait' : aspectRatio === '16:9' ? 'landscape' : 'square';

    logger.info({ prompt: input.prompt, orientation }, 'Searching Pexels Video API for real scene footage');

    const scenes = input.scenes ?? [
      {
        sceneIndex: 0,
        concept: input.prompt,
        visualPrompt: input.prompt,
        stockKeywords: [input.prompt],
        mood: 'Cinematic',
        startHintMs: 0,
        endHintMs: durationSeconds * 1000,
      },
    ];

    const clips: MediaClip[] = [];

    for (const [i, scene] of scenes.entries()) {
      const query = scene.stockKeywords?.[0] || scene.concept || input.prompt;

      try {
        const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=3`;
        const res = await fetch(url, {
          headers: { Authorization: env.PEXELS_API_KEY },
        });

        if (res.ok) {
          const data = (await res.json()) as PexelsSearchResponse;
          const video = data.videos?.[0];
          if (video && video.video_files?.length > 0) {
            // Find best matching mp4 file
            const file =
              video.video_files.find((f) => f.quality === 'hd' && f.file_type === 'video/mp4') ??
              video.video_files.find((f) => f.file_type === 'video/mp4') ??
              video.video_files[0];

            if (file) {
              clips.push({
                id: `pexels_${video.id}_${i}`,
                url: file.link,
                thumbnailUrl: video.image,
                title: scene.concept,
                durationMs: (scene.endHintMs ?? (i + 1) * 4000) - (scene.startHintMs ?? i * 4000),
                aspectRatio,
              });
              continue;
            }
          }
        }
      } catch (err) {
        logger.warn({ err, query }, 'Failed to fetch Pexels video clip for scene');
      }

      // Fallback for this scene if query returned empty
      clips.push({
        id: `clip_${i + 1}`,
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(scene.visualPrompt)}?width=480&height=854&nologo=true`,
        title: scene.concept,
        durationMs: (scene.endHintMs ?? (i + 1) * 4000) - (scene.startHintMs ?? i * 4000),
        aspectRatio,
      });
    }

    return {
      provider: this.id,
      outputUrl: clips[0]?.url ?? '',
      thumbnailUrl: clips[0]?.thumbnailUrl,
      durationSeconds,
      aspectRatio,
      clips,
      limitationsNotice: this.getLimitations(),
    };
  }
}
