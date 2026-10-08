import { validateExtraction } from '../validators';
import { NCDScreeningData, PregnancyScreeningData } from '@asha/shared';

describe('Validation Layer', () => {
  it('should accept valid NCD screening measurements', () => {
    const validData: NCDScreeningData = {
      bp_systolic: { value: 140, status: 'known' },
      bp_diastolic: { value: 90, status: 'known' },
      blood_glucose: { value: 150, status: 'known' },
      tobacco_use: { value: false, status: 'known' },
      alcohol_use: { value: false, status: 'known' },
      known_hypertension: { value: false, status: 'known' },
      known_diabetes: { value: false, status: 'known' },
      medication_adherence: { value: 'adherent', status: 'known' },
      symptoms: { value: [], status: 'known' }
    };

    const res = validateExtraction('scr_1', 'pat_1', 'NCD', validData);
    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.verifiedRecord).toBeDefined();
  });

  it('should reject physiologically impossible BP values', () => {
    const invalidData: NCDScreeningData = {
      bp_systolic: { value: 350, status: 'known' }, // Above 300
      bp_diastolic: { value: 20, status: 'known' },  // Below 30
      blood_glucose: { value: 120, status: 'known' },
      tobacco_use: { value: false, status: 'known' },
      alcohol_use: { value: false, status: 'known' },
      known_hypertension: { value: false, status: 'known' },
      known_diabetes: { value: false, status: 'known' },
      medication_adherence: { value: 'adherent', status: 'known' },
      symptoms: { value: [], status: 'known' }
    };

    const res = validateExtraction('scr_2', 'pat_2', 'NCD', invalidData);
    expect(res.isValid).toBe(false);
    expect(res.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('should reject systolic BP being lower than diastolic BP', () => {
    const invertedBP: NCDScreeningData = {
      bp_systolic: { value: 80, status: 'known' },
      bp_diastolic: { value: 120, status: 'known' },
      blood_glucose: { value: 100, status: 'known' },
      tobacco_use: { value: false, status: 'known' },
      alcohol_use: { value: false, status: 'known' },
      known_hypertension: { value: false, status: 'known' },
      known_diabetes: { value: false, status: 'known' },
      medication_adherence: { value: 'adherent', status: 'known' },
      symptoms: { value: [], status: 'known' }
    };

    const res = validateExtraction('scr_3', 'pat_3', 'NCD', invertedBP);
    expect(res.isValid).toBe(false);
    expect(res.errors).toContain('सिस्टोलिक बीपी हमेशा डायस्टोलिक बीपी से अधिक होना चाहिए।');
  });

  it('should emit a warning when blood glucose is missing', () => {
    const missingGlucoseData: NCDScreeningData = {
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

    const res = validateExtraction('scr_4', 'pat_4', 'NCD', missingGlucoseData);
    expect(res.isValid).toBe(true);
    expect(res.warnings).toContain('ब्लड शुगर जांच दर्ज नहीं की गई है।');
  });
});
