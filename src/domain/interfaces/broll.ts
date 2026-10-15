export interface SceneConcept {
  sceneIndex: number;
  concept: string;
  visualPrompt: string;
  stockKeywords: string[];
  mood: string;
  startHintMs: number | null;
  endHintMs: number | null;
}

export interface BrollExtractionResult {
  summary: string;
  scenes: SceneConcept[];
  provider: 'anthropic' | 'openai';
}

export interface BrollExtractOptions {
  maxScenes?: number;
  language?: string;
}

export interface IBrollExtractorService {
  extract(transcript: string, options?: BrollExtractOptions): Promise<BrollExtractionResult>;
}
