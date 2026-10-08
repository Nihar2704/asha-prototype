import {
  StructuredScreeningData,
  ScreeningType,
  VerifiedScreeningRecord,
  RuleResult
} from '@asha/shared';

export interface TranscriptionResult {
  transcript: string;
  durationSeconds: number;
  confidence?: number;
}

export interface ExtractionResult {
  structuredData: StructuredScreeningData;
  uncertainFields: string[];
  missingFields: string[];
}

export interface SummaryResult {
  summary: string;
  generatedAt: string;
}

export interface LocalAIService {
  transcribe(audioPath: string): Promise<TranscriptionResult>;
  extractScreeningData(transcript: string, screeningType: ScreeningType): Promise<ExtractionResult>;
  generateSummary(verifiedRecord: VerifiedScreeningRecord, ruleResults: RuleResult[]): Promise<SummaryResult>;
}
