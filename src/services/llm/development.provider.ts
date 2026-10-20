import type {
  ILlmProvider,
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmProviderInfo,
} from '../../domain/interfaces/llm.provider.js';
import { logger } from '../../utils/logger.js';

export class DevelopmentLlmProvider implements ILlmProvider {
  readonly id = 'development';
  readonly displayName = 'Development Heuristic Planner (Zero-Key Fallback)';
  readonly isFreeTier = true;

  isConfigured(): boolean {
    return true; // Always available out-of-the-box for development
  }

  getMissingConfigReason(): string | null {
    return null;
  }

  getInfo(): LlmProviderInfo {
    return {
      id: this.id,
      displayName: this.displayName,
      isFreeTier: this.isFreeTier,
      isConfigured: true,
      defaultModel: 'cineai-heuristic-dev-v1',
      websiteUrl: 'https://github.com/google/cineai',
      setupInstructions:
        'Always active by default. For cloud AI reasoning, set GEMINI_API_KEY (free) or GROQ_API_KEY (free) in .env.',
    };
  }

  async completeJson<T = unknown>(
    systemPrompt: string,
    userPrompt: string,
    _options?: LlmCompletionOptions,
  ): Promise<LlmCompletionResult<T>> {
    logger.info({ provider: this.id }, 'Executing development heuristic LLM planner');

    // Parse user input if JSON string
    let parsedUser: Record<string, unknown> = {};
    try {
      parsedUser = JSON.parse(userPrompt) as Record<string, unknown>;
    } catch {
      parsedUser = { prompt: userPrompt };
    }

    const rawPrompt = String(
      parsedUser.prompt ?? parsedUser.transcript ?? userPrompt,
    ).trim();

    // Extract key words and concepts
    const words = rawPrompt
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const topic = words.slice(0, 3).join(' ') || 'cinematic story';
    const isBrollExtraction = systemPrompt.toLowerCase().includes('b-roll');
    const isVideoPlan = systemPrompt.toLowerCase().includes('video-generation') || systemPrompt.toLowerCase().includes('generate');

    let resultObj: unknown;

    if (isBrollExtraction) {
      resultObj = {
        summary: `Documentary B-roll extraction focused on ${topic}`,
        scenes: [
          {
            sceneIndex: 0,
            concept: `Establishing cinematic view of ${topic}`,
            visualPrompt: `Wide 35mm cinematic establishing shot of ${topic}, warm natural lighting, slow pan`,
            stockKeywords: [topic, 'cinematic 4k', 'establishing shot', 'drone aerial'],
            mood: 'Inspiring & Open',
            startHintMs: 0,
            endHintMs: 4000,
          },
          {
            sceneIndex: 1,
            concept: `Dynamic action and motion in ${topic}`,
            visualPrompt: `Medium dynamic tracking shot focusing on energy and movement in ${topic}`,
            stockKeywords: [`${topic} action`, 'slow motion', 'artisan detail', 'high motion'],
            mood: 'Energetic & Focused',
            startHintMs: 4000,
            endHintMs: 8500,
          },
          {
            sceneIndex: 2,
            concept: `Emotional expressive climax of ${topic}`,
            visualPrompt: `Close-up expressive portrait shot with shallow depth of field, warm golden hour glow`,
            stockKeywords: ['genuine smile', 'golden hour portrait', 'cinematic lighting', 'emotional peak'],
            mood: 'Joyful & Climax',
            startHintMs: 8500,
            endHintMs: 13000,
          },
          {
            sceneIndex: 3,
            concept: `Memorable closing scene for ${topic}`,
            visualPrompt: `Atmospheric pull-back wide shot, lingering sunset glow, cinematic bokeh`,
            stockKeywords: ['sunset horizon', 'cinematic end', 'peaceful resolution', 'travel aesthetic'],
            mood: 'Peaceful & Resolved',
            startHintMs: 13000,
            endHintMs: 15000,
          },
        ],
      };
    } else if (isVideoPlan) {
      resultObj = {
        title: rawPrompt.length > 30 ? `${rawPrompt.slice(0, 28)}…` : (rawPrompt || 'CineAI Generation'),
        enhancedPrompt: `Ultra-high-definition cinematic 8k footage: ${rawPrompt}. 35mm anamorphic lens, golden hour rim lighting, professional color grade, photorealistic textures, dynamic subtle camera motion.`,
        negativePrompt: 'blurry, low resolution, warped hands, artifacts, jitter, stutter, oversaturated cartoon',
        mood: 'Cinematic & Engaging',
        colorPalette: 'Teal and amber with rich shadow contrast',
        scenes: [
          {
            sceneIndex: 0,
            concept: 'Atmospheric opening',
            visualPrompt: `Wide cinematic opening of ${rawPrompt}, slow smooth push-in`,
            stockKeywords: [topic, 'establishing', 'cinematic 4k'],
            mood: 'Atmospheric',
            startHintMs: 0,
            endHintMs: 4000,
          },
          {
            sceneIndex: 1,
            concept: 'Main narrative focal point',
            visualPrompt: `Crisp medium shot highlighting key elements of ${rawPrompt}`,
            stockKeywords: [topic, 'dynamic motion', 'detailed'],
            mood: 'Energetic',
            startHintMs: 4000,
            endHintMs: 10000,
          },
          {
            sceneIndex: 2,
            concept: 'Climax & resolution',
            visualPrompt: `Wide cinematic perspective with lingering bokeh reflections`,
            stockKeywords: [topic, 'epic climax', 'cinematic lighting'],
            mood: 'Triumphant',
            startHintMs: 10000,
            endHintMs: 15000,
          },
        ],
        soundtrackMood: 'Ambient cinematic electronic with building percussion',
        narration: `A vivid glimpse into ${topic}, crafted frame by frame.`,
      };
    } else {
      // General auto-edit / narrative plan
      resultObj = {
        title: `Edit Plan: ${topic}`,
        summary: `Narrative arc structured for ${topic} with beat-synced pacing`,
        narrativeArc: {
          open: {
            clipId: 'clip_01',
            startMs: 0,
            endMs: 3500,
            score: 0.94,
            reasonCodes: ['highMotion', 'beautifulLight'],
          },
          build: {
            clipId: 'clip_02',
            startMs: 3500,
            endMs: 7800,
            score: 0.89,
            reasonCodes: ['speechEnergy', 'sceneVariety'],
          },
          climax: {
            clipId: 'clip_03',
            startMs: 7800,
            endMs: 11500,
            score: 0.97,
            reasonCodes: ['bigSmile', 'audioPeak'],
          },
          close: {
            clipId: 'clip_04',
            startMs: 11500,
            endMs: 15000,
            score: 0.91,
            reasonCodes: ['beautifulLight', 'sceneVariety'],
          },
        },
        moments: [
          {
            clipId: 'clip_01',
            startMs: 0,
            endMs: 3500,
            score: 0.94,
            reasonCodes: ['highMotion', 'beautifulLight'],
          },
          {
            clipId: 'clip_02',
            startMs: 3500,
            endMs: 7800,
            score: 0.89,
            reasonCodes: ['speechEnergy', 'sceneVariety'],
          },
          {
            clipId: 'clip_03',
            startMs: 7800,
            endMs: 11500,
            score: 0.97,
            reasonCodes: ['bigSmile', 'audioPeak'],
          },
          {
            clipId: 'clip_04',
            startMs: 11500,
            endMs: 15000,
            score: 0.91,
            reasonCodes: ['beautifulLight', 'sceneVariety'],
          },
        ],
        chosenBpm: 124.0,
        colorGrade: {
          vibe: 'cinematic',
          lutPath: 'assets/luts/cinematic_teal_orange.cube',
          contrast: 1.15,
          saturation: 1.08,
          temperature: 0.05,
          grainAmount: 0.04,
        },
      };
    }

    const text = JSON.stringify(resultObj, null, 2);

    return {
      text,
      parsed: resultObj as T,
      provider: this.id,
      model: 'cineai-heuristic-dev-v1',
      fallbackUsed: true,
      notes:
        'Generated via Development Heuristic Planner. Set GEMINI_API_KEY (free at https://aistudio.google.com) or GROQ_API_KEY (free at https://console.groq.com) for live cloud LLM reasoning.',
    };
  }
}
