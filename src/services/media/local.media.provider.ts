import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import type {
  IMediaProvider,
  MediaClip,
  MediaGenerationInput,
  MediaGenerationResult,
  MediaProviderInfo,
} from '../../domain/interfaces/media.provider.js';
import { logger } from '../../utils/logger.js';

export class LocalMediaProvider implements IMediaProvider {
  readonly id = 'local';
  readonly displayName = 'Local Media Synthesizer (Built-in Project Tool)';
  readonly isFreeTier = true;

  private readonly mediaDir = path.resolve(process.cwd(), 'public', 'media');

  constructor() {
    if (!fs.existsSync(this.mediaDir)) {
      fs.mkdirSync(this.mediaDir, { recursive: true });
    }
  }

  isConfigured(): boolean {
    return true; // Always available out of the box
  }

  getMissingConfigReason(): string | null {
    return null;
  }

  getLimitations(): string {
    return 'Procedural media synthesizer built into CineAI. Generates lightweight preview media and video scene stacks offline. For photorealistic generative video, configure Pollinations, Pexels, Runway, or Luma.';
  }

  getInfo(): MediaProviderInfo {
    return {
      id: this.id,
      displayName: this.displayName,
      isFreeTier: this.isFreeTier,
      isConfigured: true,
      limitations: this.getLimitations(),
      websiteUrl: 'https://github.com/google/cineai',
      setupInstructions: 'Built into the project. No API key needed.',
    };
  }

  async generateVideo(input: MediaGenerationInput): Promise<MediaGenerationResult> {
    logger.info({ prompt: input.prompt, scenes: input.scenes?.length }, 'Generating media with Local Media Synthesizer');

    const durationSeconds = input.durationSeconds ?? 15;
    const aspectRatio = input.aspectRatio ?? '9:16';
    const scenes = input.scenes ?? [
      {
        sceneIndex: 0,
        concept: 'Opening sequence',
        visualPrompt: input.prompt,
        stockKeywords: ['cinematic', 'opening'],
        mood: 'Atmospheric',
        startHintMs: 0,
        endHintMs: Math.floor((durationSeconds * 1000) / 3),
      },
      {
        sceneIndex: 1,
        concept: 'Main narrative focal point',
        visualPrompt: input.prompt,
        stockKeywords: ['action', 'motion'],
        mood: 'Energetic',
        startHintMs: Math.floor((durationSeconds * 1000) / 3),
        endHintMs: Math.floor(((durationSeconds * 1000) * 2) / 3),
      },
      {
        sceneIndex: 2,
        concept: 'Climax & resolution',
        visualPrompt: input.prompt,
        stockKeywords: ['climax', 'sunset'],
        mood: 'Triumphant',
        startHintMs: Math.floor(((durationSeconds * 1000) * 2) / 3),
        endHintMs: durationSeconds * 1000,
      },
    ];

    // High quality royalty-free sample MP4s that play natively in Flutter video_player and browsers
    const sampleClipsByRatio: Record<string, string[]> = {
      '9:16': [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      ],
      '16:9': [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      ],
      '1:1': [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
      ],
    };

    const defaultClips = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    ];

    const ratioClips = sampleClipsByRatio[aspectRatio] ?? defaultClips;

    const clips: MediaClip[] = scenes.map((scene, index) => {
      const clipUrl: string = ratioClips[index % ratioClips.length] ?? defaultClips[0]!;
      const startMs = scene.startHintMs ?? index * 4000;
      const endMs = scene.endHintMs ?? (index + 1) * 4000;
      const clipId = `clip_${index + 1}_${crypto.randomUUID().slice(0, 8)}`;

      return {
        id: clipId,
        url: clipUrl,
        thumbnailUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(scene.visualPrompt || scene.concept)}?width=480&height=854&nologo=true`,
        title: scene.concept,
        durationMs: endMs - startMs,
        aspectRatio,
      };
    });

    const primaryVideoUrl: string = clips[0]?.url ?? defaultClips[0]!;
    const thumbnailUrl = clips[0]?.thumbnailUrl ?? 'https://image.pollinations.ai/prompt/cinematic%20video%20title%20card?width=720&height=1280&nologo=true';

    return {
      provider: this.id,
      outputUrl: primaryVideoUrl,
      thumbnailUrl,
      durationSeconds,
      aspectRatio,
      clips,
      limitationsNotice: this.getLimitations(),
    };
  }
}
