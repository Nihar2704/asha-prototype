import { LocalAIService } from './types';
import { validateExtraction } from '../rules/validators';
import { RuleEngine } from '../rules/engine';
import {
  ScreeningType,
  VerifiedScreeningRecord,
  RuleResult
} from '@asha/shared';

export interface PipelineOutput {
  transcript: string;
  transcriptionTimeSeconds: number;
  extractedRaw: Record<string, unknown>;
  verifiedRecord: VerifiedScreeningRecord;
  ruleResults: RuleResult[];
  summary: string;
  hasHighPriority: boolean;
  warnings: string[];
}

export class ScreeningPipelineOrchestrator {
  private aiService: LocalAIService;
  private ruleEngine: RuleEngine;

  constructor(aiService: LocalAIService, ruleEngine = new RuleEngine()) {
    this.aiService = aiService;
    this.ruleEngine = ruleEngine;
  }

  /**
   * Orchestrates the complete offline voice screening journey
   * Audio -> STT -> Extraction -> Validation -> Deterministic Rules -> Hindi Summary
   */
  async processVoiceScreening(
    audioPath: string,
    screeningType: ScreeningType,
    patientId: string,
    screeningId = `scr_${Date.now()}`
  ): Promise<PipelineOutput> {
    // Step 1: Transcribe Hindi speech using local Whisper
    const sttResult = await this.aiService.transcribe(audioPath);

    // Step 2: Convert transcript to structured JSON schema via Needle 2
    const extractionResult = await this.aiService.extractScreeningData(sttResult.transcript, screeningType);

    // Step 3: Validate schema, ranges, and detect contradictions
    const validation = validateExtraction(
      screeningId,
      patientId,
      screeningType,
      extractionResult.structuredData
    );

    if (!validation.isValid || !validation.verifiedRecord) {
      throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
    }

    // Step 4: Run deterministic protocol rules (ZERO LLM influence on risk)
    const ruleResults = this.ruleEngine.evaluate(validation.verifiedRecord);

    // Step 5: Generate frontline Hindi explanation via Qwen3-1.7B
    const summaryResult = await this.aiService.generateSummary(validation.verifiedRecord, ruleResults);

    const hasHighPriority = ruleResults.some((r) => r.triggered && r.priority === 'high');

    return {
      transcript: sttResult.transcript,
      transcriptionTimeSeconds: sttResult.durationSeconds,
      extractedRaw: extractionResult.structuredData as unknown as Record<string, unknown>,
      verifiedRecord: validation.verifiedRecord,
      ruleResults,
      summary: summaryResult.summary,
      hasHighPriority,
      warnings: validation.warnings
    };
  }
}
