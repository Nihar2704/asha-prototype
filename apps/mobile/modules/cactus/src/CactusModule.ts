import { STTOptions, ModelLoadOptions } from './CactusModule.types';

// Native module loader interface
export interface ICactusNativeModule {
  loadWhisper(options: ModelLoadOptions): Promise<boolean>;
  unloadWhisper(): Promise<boolean>;
  transcribe(audioPath: string, options: STTOptions): Promise<string>;

  loadNeedle(options: ModelLoadOptions): Promise<boolean>;
  unloadNeedle(): Promise<boolean>;
  extract(transcript: string, schemaJson: string): Promise<string>;

  loadQwen(options: ModelLoadOptions): Promise<boolean>;
  unloadQwen(): Promise<boolean>;
  generate(prompt: string, maxTokens: number): Promise<string>;

  isAvailable(): boolean;
}

// In Expo development build, this is injected by requireNativeModule('cactus-expo')
let NativeCactus: ICactusNativeModule | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { requireNativeModule } = require('expo-modules-core');
  NativeCactus = requireNativeModule('cactus-expo');
} catch {
  NativeCactus = null;
}

export const CactusModule: ICactusNativeModule = {
  async loadWhisper(options: ModelLoadOptions): Promise<boolean> {
    if (!NativeCactus) throw new Error('Native Cactus module is not available in current environment');
    return NativeCactus.loadWhisper(options);
  },

  async unloadWhisper(): Promise<boolean> {
    if (!NativeCactus) return true;
    return NativeCactus.unloadWhisper();
  },

  async transcribe(audioPath: string, options: STTOptions): Promise<string> {
    if (!NativeCactus) throw new Error('Native Cactus module is not available in current environment');
    return NativeCactus.transcribe(audioPath, options);
  },

  async loadNeedle(options: ModelLoadOptions): Promise<boolean> {
    if (!NativeCactus) throw new Error('Native Cactus module is not available in current environment');
    return NativeCactus.loadNeedle(options);
  },

  async unloadNeedle(): Promise<boolean> {
    if (!NativeCactus) return true;
    return NativeCactus.unloadNeedle();
  },

  async extract(transcript: string, schemaJson: string): Promise<string> {
    if (!NativeCactus) throw new Error('Native Cactus module is not available in current environment');
    return NativeCactus.extract(transcript, schemaJson);
  },

  async loadQwen(options: ModelLoadOptions): Promise<boolean> {
    if (!NativeCactus) throw new Error('Native Cactus module is not available in current environment');
    return NativeCactus.loadQwen(options);
  },

  async unloadQwen(): Promise<boolean> {
    if (!NativeCactus) return true;
    return NativeCactus.unloadQwen();
  },

  async generate(prompt: string, maxTokens: number): Promise<string> {
    if (!NativeCactus) throw new Error('Native Cactus module is not available in current environment');
    return NativeCactus.generate(prompt, maxTokens);
  },

  isAvailable(): boolean {
    return NativeCactus !== null && (NativeCactus.isAvailable ? NativeCactus.isAvailable() : true);
  }
};
