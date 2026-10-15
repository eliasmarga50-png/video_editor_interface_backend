import { InMemoryTaskStore } from './infrastructure/task-store.js';
import { BrollExtractorService } from './services/broll_extractor.service.js';
import { LlmClient } from './services/llm.client.js';
import { TranslationService } from './services/translation.service.js';
import { VideoGenService } from './services/video_gen.service.js';
import { WhisperService } from './services/whisper.service.js';

const llm = new LlmClient();
const taskStore = new InMemoryTaskStore();

export const whisperService = new WhisperService(llm);
export const translationService = new TranslationService(llm);
export const brollExtractorService = new BrollExtractorService(llm);
export const videoGenService = new VideoGenService(taskStore);
