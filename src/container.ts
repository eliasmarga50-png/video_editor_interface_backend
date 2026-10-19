import { InMemoryTaskStore } from './infrastructure/task-store.js';
import { AutoEditService } from './services/auto_edit.service.js';
import { BrollExtractorService } from './services/broll_extractor.service.js';
import { LlmClient } from './services/llm.client.js';
import { LlmService } from './services/llm/llm.service.js';
import { MediaService } from './services/media/media.service.js';
import { TranslationService } from './services/translation.service.js';
import { VideoGenService } from './services/video_gen.service.js';
import { WhisperService } from './services/whisper.service.js';

export const llmService = new LlmService();
export const mediaService = new MediaService();
export const taskStore = new InMemoryTaskStore();

export const llmClient = new LlmClient(llmService);
export const whisperService = new WhisperService(llmClient);
export const translationService = new TranslationService(llmClient);
export const brollExtractorService = new BrollExtractorService(llmClient);

export const videoGenService = new VideoGenService(taskStore, llmService, mediaService);
export const autoEditService = new AutoEditService(taskStore, llmService, mediaService);
