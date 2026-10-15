import { createReadStream } from 'node:fs';
import type { TranscriptionCreateParams } from 'openai/resources/audio/transcriptions';
import { env } from '../config/env.js';
import { AppError } from '../domain/errors/app-error.js';
import type {
  IWhisperService,
  TranscribeOptions,
  TranscriptionResult,
  TranscriptSegment,
} from '../domain/interfaces/transcription.js';
import { logger } from '../utils/logger.js';
import { secondsToMs } from '../utils/http.js';
import type { LlmClient } from './llm.client.js';

interface WhisperVerboseJson {
  text?: string;
  language?: string;
  duration?: number;
  segments?: Array<{
    id?: number;
    start?: number;
    end?: number;
    text?: string;
  }>;
}

export class WhisperService implements IWhisperService {
  constructor(private readonly llm: LlmClient) {}

  async transcribe(
    filePath: string,
    mimeType: string,
    options: TranscribeOptions = {},
  ): Promise<TranscriptionResult> {
    logger.info({ filePath, mimeType, language: options.language }, 'Starting Whisper transcription');

    try {
      const params: TranscriptionCreateParams = {
        file: createReadStream(filePath),
        model: env.WHISPER_MODEL,
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      };
      if (options.language) params.language = options.language;
      if (options.prompt) params.prompt = options.prompt;

      const raw = (await this.llm.openaiClient.audio.transcriptions.create(
        params,
      )) as unknown as WhisperVerboseJson;

      const segments: TranscriptSegment[] = (raw.segments ?? []).map((segment, index) => ({
        index: segment.id ?? index,
        startMs: secondsToMs(segment.start ?? 0),
        endMs: secondsToMs(segment.end ?? 0),
        text: (segment.text ?? '').trim(),
      }));

      const durationMs =
        secondsToMs(raw.duration ?? 0) ||
        (segments.length > 0 ? (segments[segments.length - 1]?.endMs ?? 0) : 0);

      return {
        language: raw.language ?? options.language ?? 'unknown',
        durationMs,
        text: (raw.text ?? segments.map((s) => s.text).join(' ')).trim(),
        segments,
        provider: 'openai-whisper',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error({ err: error, filePath }, 'Whisper transcription failed');
      throw AppError.upstream('Audio transcription failed', error);
    }
  }
}
