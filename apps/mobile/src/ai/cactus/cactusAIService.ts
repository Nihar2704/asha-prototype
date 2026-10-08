import { LocalAIService, TranscriptionResult, ExtractionResult, SummaryResult } from '../types';
import { CactusModule } from '../../../modules/cactus/src/CactusModule';
import {
  ScreeningType,
  VerifiedScreeningRecord,
  RuleResult,
  StructuredScreeningData,
  NCDScreeningData,
  PregnancyScreeningData
} from '@asha/shared';

export interface CactusConfig {
  whisperModelPath: string;
  needleModelPath: string;
  qwenModelPath: string;
}

export class CactusAIService implements LocalAIService {
  private config: CactusConfig;

  constructor(config: CactusConfig) {
    this.config = config;
  }

  /**
   * Transcribe 16kHz PCM audio to Hindi transcript using local Whisper Tiny Hindi
   */
  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    const startTime = Date.now();
    try {
      // 1. Load Whisper into Cactus runtime
      await CactusModule.loadWhisper({ modelPath: this.config.whisperModelPath });

      // 2. Transcribe audio with deterministic settings (PRD §8.1)
      const transcript = await CactusModule.transcribe(audioPath, {
        language: 'hi',
        temperature: 0,
        maxTokens: 448,
        useVad: true
      });

      // 3. Promptly unload Whisper to free mobile RAM
      await CactusModule.unloadWhisper();

      const durationSeconds = (Date.now() - startTime) / 1000;
      return {
        transcript: transcript.trim(),
        durationSeconds
      };
    } catch (error) {
      await CactusModule.unloadWhisper();
      throw new Error(`Whisper STT failed: ${(error as Error).message}`);
    }
  }

  /**
   * Extract structured fields from Hindi transcript using Cactus Needle 2
   */
  async extractScreeningData(transcript: string, screeningType: ScreeningType): Promise<ExtractionResult> {
    try {
      // 1. Load Needle 2 model
      await CactusModule.loadNeedle({ modelPath: this.config.needleModelPath });

      // 2. Define schema prompt according to screening type
      const schemaDefinition = screeningType === 'NCD' ? getNCDNeedleSchema() : getPregnancyNeedleSchema();

      // 3. Extract JSON strictly constrained to grammar
      const rawJson = await CactusModule.extract(transcript, JSON.stringify(schemaDefinition));

      // 4. Release Needle 2 to conserve memory
      await CactusModule.unloadNeedle();

      const parsed = JSON.parse(rawJson);
      return parseNeedleOutput(parsed, screeningType);
    } catch (error) {
      await CactusModule.unloadNeedle();
      throw new Error(`Needle 2 extraction failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate simple frontline Hindi summary using Qwen3-1.7B
   * Strictly non-thinking, rule explanations only (PRD §26, §27)
   */
  async generateSummary(
    verifiedRecord: VerifiedScreeningRecord,
    ruleResults: RuleResult[]
  ): Promise<SummaryResult> {
    try {
      // 1. Load Qwen3-1.7B
      await CactusModule.loadQwen({ modelPath: this.config.qwenModelPath });

      // 2. Build verified prompt
      const prompt = buildQwenPrompt(verifiedRecord, ruleResults);

      // 3. Generate concise Hindi explanation
      const summary = await CactusModule.generate(prompt, 256);

      // 4. Release Qwen
      await CactusModule.unloadQwen();

      return {
        summary: summary.trim(),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      await CactusModule.unloadQwen();
      throw new Error(`Qwen3 summary failed: ${(error as Error).message}`);
    }
  }
}

function getNCDNeedleSchema() {
  return {
    type: 'object',
    properties: {
      bp_systolic: { type: ['number', 'null'] },
      bp_diastolic: { type: ['number', 'null'] },
      blood_glucose: { type: ['number', 'null'] },
      tobacco_use: { type: ['boolean', 'null'] },
      alcohol_use: { type: ['boolean', 'null'] },
      known_hypertension: { type: ['boolean', 'null'] },
      known_diabetes: { type: ['boolean', 'null'] },
      symptoms: { type: 'array', items: { type: 'string' } }
    }
  };
}

function getPregnancyNeedleSchema() {
  return {
    type: 'object',
    properties: {
      pregnancy_status: { type: ['boolean', 'null'] },
      gestational_age_weeks: { type: ['number', 'null'] },
      vaginal_bleeding: { type: ['boolean', 'null'] },
      severe_headache: { type: ['boolean', 'null'] },
      blurred_vision: { type: ['boolean', 'null'] },
      severe_abdominal_pain: { type: ['boolean', 'null'] },
      reduced_fetal_movement: { type: ['boolean', 'null'] },
      swelling: { type: ['boolean', 'null'] },
      fever: { type: ['boolean', 'null'] }
    }
  };
}

function parseNeedleOutput(parsed: Record<string, unknown>, screeningType: ScreeningType): ExtractionResult {
  const uncertainFields: string[] = [];
  const missingFields: string[] = [];

  if (screeningType === 'NCD') {
    const data: NCDScreeningData = {
      bp_systolic: {
        value: typeof parsed.bp_systolic === 'number' ? parsed.bp_systolic : null,
        status: typeof parsed.bp_systolic === 'number' ? 'known' : 'missing'
      },
      bp_diastolic: {
        value: typeof parsed.bp_diastolic === 'number' ? parsed.bp_diastolic : null,
        status: typeof parsed.bp_diastolic === 'number' ? 'known' : 'missing'
      },
      blood_glucose: {
        value: typeof parsed.blood_glucose === 'number' ? parsed.blood_glucose : null,
        status: typeof parsed.blood_glucose === 'number' ? 'known' : 'missing'
      },
      tobacco_use: {
        value: typeof parsed.tobacco_use === 'boolean' ? parsed.tobacco_use : null,
        status: typeof parsed.tobacco_use === 'boolean' ? 'known' : 'missing'
      },
      alcohol_use: {
        value: typeof parsed.alcohol_use === 'boolean' ? parsed.alcohol_use : null,
        status: typeof parsed.alcohol_use === 'boolean' ? 'known' : 'missing'
      },
      known_hypertension: {
        value: typeof parsed.known_hypertension === 'boolean' ? parsed.known_hypertension : null,
        status: typeof parsed.known_hypertension === 'boolean' ? 'known' : 'missing'
      },
      known_diabetes: {
        value: typeof parsed.known_diabetes === 'boolean' ? parsed.known_diabetes : null,
        status: typeof parsed.known_diabetes === 'boolean' ? 'known' : 'missing'
      },
      medication_adherence: {
        value: typeof parsed.medication_adherence === 'string' ? parsed.medication_adherence : null,
        status: typeof parsed.medication_adherence === 'string' ? 'known' : 'missing'
      },
      symptoms: {
        value: Array.isArray(parsed.symptoms) ? parsed.symptoms : [],
        status: 'known'
      }
    };

    if (data.bp_systolic.status === 'missing') missingFields.push('bp_systolic');
    if (data.bp_diastolic.status === 'missing') missingFields.push('bp_diastolic');
    if (data.blood_glucose.status === 'missing') missingFields.push('blood_glucose');

    return { structuredData: data, uncertainFields, missingFields };
  } else {
    const data: PregnancyScreeningData = {
      pregnancy_status: {
        value: typeof parsed.pregnancy_status === 'boolean' ? parsed.pregnancy_status : true,
        status: 'known'
      },
      gestational_age_weeks: {
        value: typeof parsed.gestational_age_weeks === 'number' ? parsed.gestational_age_weeks : null,
        status: typeof parsed.gestational_age_weeks === 'number' ? 'known' : 'missing'
      },
      vaginal_bleeding: {
        value: typeof parsed.vaginal_bleeding === 'boolean' ? parsed.vaginal_bleeding : false,
        status: 'known'
      },
      severe_headache: {
        value: typeof parsed.severe_headache === 'boolean' ? parsed.severe_headache : false,
        status: 'known'
      },
      blurred_vision: {
        value: typeof parsed.blurred_vision === 'boolean' ? parsed.blurred_vision : false,
        status: 'known'
      },
      severe_abdominal_pain: {
        value: typeof parsed.severe_abdominal_pain === 'boolean' ? parsed.severe_abdominal_pain : false,
        status: 'known'
      },
      reduced_fetal_movement: {
        value: typeof parsed.reduced_fetal_movement === 'boolean' ? parsed.reduced_fetal_movement : false,
        status: 'known'
      },
      swelling: {
        value: typeof parsed.swelling === 'boolean' ? parsed.swelling : false,
        status: 'known'
      },
      fever: {
        value: typeof parsed.fever === 'boolean' ? parsed.fever : false,
        status: 'known'
      },
      follow_up_required: {
        value: false,
        status: 'known'
      }
    };

    return { structuredData: data, uncertainFields, missingFields };
  }
}

function buildQwenPrompt(record: VerifiedScreeningRecord, ruleResults: RuleResult[]): string {
  return `<|im_start|>system
You are the explanation and summarization assistant inside an offline frontline health-worker application.
You are NOT a doctor and you must NOT diagnose.
Use ONLY the verified structured information supplied to you.
Explain existing flags in simple Hindi. Keep the output short and easy for an ASHA worker to understand.
<|im_end|>
<|im_start|>user
Verified Record:
${JSON.stringify(record.structured_data)}

Rule Results:
${JSON.stringify(ruleResults)}
<|im_end|>
<|im_start|>assistant
`;
}
