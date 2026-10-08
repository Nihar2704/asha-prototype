import { RuleEngine } from '../engine';
import { VerifiedScreeningRecord, NCDScreeningData, PregnancyScreeningData } from '@asha/shared';

describe('Deterministic RuleEngine', () => {
  const engine = new RuleEngine();

  describe('NCD Protocol Rules', () => {
    it('should trigger high priority flag when BP exceeds protocol threshold (160/100 mmHg)', () => {
      const ncdData: NCDScreeningData = {
        bp_systolic: { value: 160, status: 'known' },
        bp_diastolic: { value: 100, status: 'known' },
        blood_glucose: { value: 110, status: 'known' },
        tobacco_use: { value: false, status: 'known' },
        alcohol_use: { value: false, status: 'known' },
        known_hypertension: { value: false, status: 'known' },
        known_diabetes: { value: false, status: 'known' },
        medication_adherence: { value: 'adherent', status: 'known' },
        symptoms: { value: [], status: 'known' }
      };

      const record: VerifiedScreeningRecord = {
        screening_id: 'scr_test_1',
        patient_id: 'pat_1',
        screening_type: 'NCD',
        structured_data: ncdData,
        validation_warnings: []
      };

      const results = engine.evaluate(record);
      const bpRule = results.find((r) => r.ruleId === 'NCD_BP_EVALUATION');

      expect(bpRule).toBeDefined();
      expect(bpRule?.triggered).toBe(true);
      expect(bpRule?.priority).toBe('high');
      expect(bpRule?.reason).toContain('160/100');
    });

    it('should assign low priority when BP is normal (120/80 mmHg)', () => {
      const ncdData: NCDScreeningData = {
        bp_systolic: { value: 120, status: 'known' },
        bp_diastolic: { value: 80, status: 'known' },
        blood_glucose: { value: 100, status: 'known' },
        tobacco_use: { value: false, status: 'known' },
        alcohol_use: { value: false, status: 'known' },
        known_hypertension: { value: false, status: 'known' },
        known_diabetes: { value: false, status: 'known' },
        medication_adherence: { value: 'adherent', status: 'known' },
        symptoms: { value: [], status: 'known' }
      };

      const record: VerifiedScreeningRecord = {
        screening_id: 'scr_test_2',
        patient_id: 'pat_2',
        screening_type: 'NCD',
        structured_data: ncdData,
        validation_warnings: []
      };

      const results = engine.evaluate(record);
      const bpRule = results.find((r) => r.ruleId === 'NCD_BP_EVALUATION');

      expect(bpRule).toBeDefined();
      expect(bpRule?.triggered).toBe(false);
      expect(bpRule?.priority).toBe('low');
    });

    it('should flag high priority when blood glucose >= 200 mg/dL', () => {
      const ncdData: NCDScreeningData = {
        bp_systolic: { value: 120, status: 'known' },
        bp_diastolic: { value: 80, status: 'known' },
        blood_glucose: { value: 210, status: 'known' },
        tobacco_use: { value: false, status: 'known' },
        alcohol_use: { value: false, status: 'known' },
        known_hypertension: { value: false, status: 'known' },
        known_diabetes: { value: false, status: 'known' },
        medication_adherence: { value: 'adherent', status: 'known' },
        symptoms: { value: [], status: 'known' }
      };

      const record: VerifiedScreeningRecord = {
        screening_id: 'scr_test_3',
        patient_id: 'pat_3',
        screening_type: 'NCD',
        structured_data: ncdData,
        validation_warnings: []
      };

      const results = engine.evaluate(record);
      const glucoseRule = results.find((r) => r.ruleId === 'NCD_GLUCOSE_EVALUATION');

      expect(glucoseRule?.triggered).toBe(true);
      expect(glucoseRule?.priority).toBe('high');
      expect(glucoseRule?.reason).toContain('210 mg/dL');
    });

    it('should flag missing glucose test for follow-up', () => {
      const ncdData: NCDScreeningData = {
        bp_systolic: { value: 120, status: 'known' },
        bp_diastolic: { value: 80, status: 'known' },
        blood_glucose: { value: null, status: 'missing' },
        tobacco_use: { value: false, status: 'known' },
        alcohol_use: { value: false, status: 'known' },
        known_hypertension: { value: false, status: 'known' },
        known_diabetes: { value: false, status: 'known' },
        medication_adherence: { value: 'adherent', status: 'known' },
        symptoms: { value: [], status: 'known' }
      };

      const record: VerifiedScreeningRecord = {
        screening_id: 'scr_test_4',
        patient_id: 'pat_4',
        screening_type: 'NCD',
        structured_data: ncdData,
        validation_warnings: []
      };

      const results = engine.evaluate(record);
      const missingRule = results.find((r) => r.ruleId === 'NCD_GLUCOSE_MISSING');

      expect(missingRule).toBeDefined();
      expect(missingRule?.priority).toBe('medium');
    });
  });

  describe('Pregnancy Danger Signs Rules', () => {
    it('should trigger high priority when maternal danger sign is reported (vaginal bleeding)', () => {
      const pregData: PregnancyScreeningData = {
        pregnancy_status: { value: true, status: 'known' },
        gestational_age_weeks: { value: 28, status: 'known' },
        vaginal_bleeding: { value: true, status: 'known' },
        severe_headache: { value: false, status: 'known' },
        blurred_vision: { value: false, status: 'known' },
        severe_abdominal_pain: { value: false, status: 'known' },
        reduced_fetal_movement: { value: false, status: 'known' },
        swelling: { value: false, status: 'known' },
        fever: { value: false, status: 'known' },
        follow_up_required: { value: false, status: 'known' }
      };

      const record: VerifiedScreeningRecord = {
        screening_id: 'scr_preg_1',
        patient_id: 'pat_preg_1',
        screening_type: 'PREGNANCY',
        structured_data: pregData,
        validation_warnings: []
      };

      const results = engine.evaluate(record);
      const dangerRule = results.find((r) => r.ruleId === 'PREGNANCY_DANGER_SIGNS');

      expect(dangerRule?.triggered).toBe(true);
      expect(dangerRule?.priority).toBe('high');
      expect(dangerRule?.reason).toContain('योनि से रक्तस्राव');
    });

    it('should assign low priority when no danger signs are present', () => {
      const pregData: PregnancyScreeningData = {
        pregnancy_status: { value: true, status: 'known' },
        gestational_age_weeks: { value: 20, status: 'known' },
        vaginal_bleeding: { value: false, status: 'known' },
        severe_headache: { value: false, status: 'known' },
        blurred_vision: { value: false, status: 'known' },
        severe_abdominal_pain: { value: false, status: 'known' },
        reduced_fetal_movement: { value: false, status: 'known' },
        swelling: { value: false, status: 'known' },
        fever: { value: false, status: 'known' },
        follow_up_required: { value: false, status: 'known' }
      };

      const record: VerifiedScreeningRecord = {
        screening_id: 'scr_preg_2',
        patient_id: 'pat_preg_2',
        screening_type: 'PREGNANCY',
        structured_data: pregData,
        validation_warnings: []
      };

      const results = engine.evaluate(record);
      const dangerRule = results.find((r) => r.ruleId === 'PREGNANCY_DANGER_SIGNS');

      expect(dangerRule?.triggered).toBe(false);
      expect(dangerRule?.priority).toBe('low');
    });
  });
});
