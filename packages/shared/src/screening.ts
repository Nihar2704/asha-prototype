import { SyncStatus } from './patient';
import { RuleResult } from './rules';

export type FieldStatus = 'known' | 'missing' | 'uncertain' | 'not_applicable';

export interface ExtractionField<T> {
  value: T | null;
  status: FieldStatus;
  rawText?: string;
}

export type ScreeningType = 'NCD' | 'PREGNANCY';

export interface NCDScreeningData {
  bp_systolic: ExtractionField<number>;
  bp_diastolic: ExtractionField<number>;
  blood_glucose: ExtractionField<number>;
  tobacco_use: ExtractionField<boolean>;
  alcohol_use: ExtractionField<boolean>;
  known_hypertension: ExtractionField<boolean>;
  known_diabetes: ExtractionField<boolean>;
  medication_adherence: ExtractionField<string>;
  symptoms: ExtractionField<string[]>;
  measurement_date?: string;
}

export interface PregnancyScreeningData {
  pregnancy_status: ExtractionField<boolean>;
  gestational_age_weeks: ExtractionField<number>;
  vaginal_bleeding: ExtractionField<boolean>;
  severe_headache: ExtractionField<boolean>;
  blurred_vision: ExtractionField<boolean>;
  severe_abdominal_pain: ExtractionField<boolean>;
  reduced_fetal_movement: ExtractionField<boolean>;
  swelling: ExtractionField<boolean>;
  fever: ExtractionField<boolean>;
  follow_up_required: ExtractionField<boolean>;
  measurement_date?: string;
}

export type StructuredScreeningData = NCDScreeningData | PregnancyScreeningData;

export interface VerifiedScreeningRecord {
  screening_id: string;
  patient_id: string;
  screening_type: ScreeningType;
  structured_data: StructuredScreeningData;
  validation_warnings: string[];
}

export interface ScreeningRecord {
  id: string; // UUID
  patient_id: string;
  screening_type: ScreeningType;
  transcript: string | null;
  structured_data: StructuredScreeningData;
  rule_results: RuleResult[];
  summary: string | null;
  confirmed: boolean;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
}
