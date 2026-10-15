export interface TranscriptSegment {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

export interface TranscriptionResult {
  language: string;
  durationMs: number;
  text: string;
  segments: TranscriptSegment[];
  provider: 'openai-whisper';
}

export interface TranscribeOptions {
  language?: string;
  prompt?: string;
}

export interface IWhisperService {
  transcribe(filePath: string, mimeType: string, options?: TranscribeOptions): Promise<TranscriptionResult>;
}
