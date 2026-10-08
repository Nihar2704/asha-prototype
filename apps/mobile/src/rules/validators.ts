import {
  StructuredScreeningData,
  ScreeningType,
  VerifiedScreeningRecord,
  NCDScreeningData,
  PregnancyScreeningData
} from '@asha/shared';

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  verifiedRecord?: VerifiedScreeningRecord;
}

export function validateExtraction(
  screeningId: string,
  patientId: string,
  screeningType: ScreeningType,
  data: StructuredScreeningData
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (screeningType === 'NCD') {
    const ncd = data as NCDScreeningData;

    // Validate Blood Pressure
    if (ncd.bp_systolic.status === 'known' && ncd.bp_systolic.value !== null) {
      const sys = ncd.bp_systolic.value;
      if (isNaN(sys) || sys < 50 || sys > 300) {
        errors.push(`अमान्य सिस्टोलिक बीपी মান (${sys} mmHg)`);
      }
    } else if (ncd.bp_systolic.status === 'uncertain') {
      warnings.push('सिस्टोलिक बीपी मान अनिश्चित है, कृपया पुष्टि करें।');
    }

    if (ncd.bp_diastolic.status === 'known' && ncd.bp_diastolic.value !== null) {
      const dia = ncd.bp_diastolic.value;
      if (isNaN(dia) || dia < 30 || dia > 200) {
        errors.push(`अमान्य डायस्टोलिक बीपी মান (${dia} mmHg)`);
      }
    } else if (ncd.bp_diastolic.status === 'uncertain') {
      warnings.push('डायस्टोलिक बीपी मान अनिश्चित है, कृपया पुष्टि करें।');
    }

    // Consistency check: Systolic must be strictly greater than diastolic
    if (
      ncd.bp_systolic.status === 'known' &&
      ncd.bp_diastolic.status === 'known' &&
      ncd.bp_systolic.value !== null &&
      ncd.bp_diastolic.value !== null
    ) {
      if (ncd.bp_systolic.value <= ncd.bp_diastolic.value) {
        errors.push('सिस्टोलिक बीपी हमेशा डायस्टोलिक बीपी से अधिक होना चाहिए।');
      }
    }

    // Validate Blood Glucose
    if (ncd.blood_glucose.status === 'known' && ncd.blood_glucose.value !== null) {
      const glu = ncd.blood_glucose.value;
      if (isNaN(glu) || glu < 20 || glu > 600) {
        errors.push(`अमान्य ब्लड ग्लूकोज মান (${glu} mg/dL)`);
      }
    } else if (ncd.blood_glucose.status === 'missing') {
      warnings.push('ब्लड शुगर जांच दर्ज नहीं की गई है।');
    }
  } else if (screeningType === 'PREGNANCY') {
    const preg = data as PregnancyScreeningData;

    // Validate gestational age
    if (preg.gestational_age_weeks.status === 'known' && preg.gestational_age_weeks.value !== null) {
      const weeks = preg.gestational_age_weeks.value;
      if (isNaN(weeks) || weeks < 1 || weeks > 44) {
        errors.push(`अमान्य गर्भ सप्ताह संख्या (${weeks})`);
      }
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    warnings,
    errors,
    verifiedRecord: isValid
      ? {
          screening_id: screeningId,
          patient_id: patientId,
          screening_type: screeningType,
          structured_data: data,
          validation_warnings: warnings
        }
      : undefined
  };
}
