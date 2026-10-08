export interface STTOptions {
  language: string;
  temperature: number;
  maxTokens: number;
  useVad: boolean;
}

export interface ModelLoadOptions {
  modelPath: string;
  threads?: number;
}
