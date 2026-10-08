import {
  VerifiedScreeningRecord,
  RuleResult,
  NCDScreeningData,
  PregnancyScreeningData
} from '@asha/shared';
import ncdConfig from './protocols/ncd-demo.json';
import pregnancyConfig from './protocols/pregnancy-demo.json';

export class RuleEngine {
  /**
   * Evaluates verified screening record against configured protocol rules
   * Completely deterministic, zero LLM dependency
   */
  evaluate(record: VerifiedScreeningRecord): RuleResult[] {
    const results: RuleResult[] = [];

    if (record.screening_type === 'NCD') {
      const data = record.structured_data as NCDScreeningData;

      // 1. Evaluate Blood Pressure against configured protocol
      if (
        ncdConfig.bp.high_reading_rule.enabled &&
        data.bp_systolic.status === 'known' &&
        data.bp_diastolic.status === 'known' &&
        data.bp_systolic.value !== null &&
        data.bp_diastolic.value !== null
      ) {
        const isBPHigh =
          data.bp_systolic.value >= ncdConfig.bp.high_reading_rule.systolic_threshold ||
          data.bp_diastolic.value >= ncdConfig.bp.high_reading_rule.diastolic_threshold;

        results.push({
          ruleId: 'NCD_BP_EVALUATION',
          ruleName: 'Blood Pressure Screening Rule',
          triggered: isBPHigh,
          priority: isBPHigh ? 'high' : 'low',
          reason: isBPHigh
            ? `${ncdConfig.bp.high_reading_rule.reason} (${data.bp_systolic.value}/${data.bp_diastolic.value} mmHg)`
            : 'ब्लड प्रेशर सामान्य सीमा के भीतर दर्ज है।',
          source: ncdConfig.bp.high_reading_rule.source,
          nextWorkflow: isBPHigh
            ? ncdConfig.bp.high_reading_rule.nextWorkflow
            : 'सामान्य वार्षिक स्क्रीनिंग एवं स्वास्थ्य सलाह।'
        });
      }

      // 2. Evaluate Blood Glucose against configured protocol
      if (
        ncdConfig.glucose.high_reading_rule.enabled &&
        data.blood_glucose.status === 'known' &&
        data.blood_glucose.value !== null
      ) {
        const isGlucoseHigh =
          data.blood_glucose.value >= ncdConfig.glucose.high_reading_rule.glucose_threshold;

        results.push({
          ruleId: 'NCD_GLUCOSE_EVALUATION',
          ruleName: 'Blood Glucose Screening Rule',
          triggered: isGlucoseHigh,
          priority: isGlucoseHigh ? 'high' : 'low',
          reason: isGlucoseHigh
            ? `${ncdConfig.glucose.high_reading_rule.reason} (${data.blood_glucose.value} mg/dL)`
            : 'ब्लड शुगर सामान्य सीमा के भीतर है।',
          source: ncdConfig.glucose.high_reading_rule.source,
          nextWorkflow: isGlucoseHigh
            ? ncdConfig.glucose.high_reading_rule.nextWorkflow
            : 'नियमित निगरानी एवं खान-पान संबंधी परामर्श।'
        });
      } else if (data.blood_glucose.status === 'missing') {
        // Flag missing glucose as an actionable informational flag
        results.push({
          ruleId: 'NCD_GLUCOSE_MISSING',
          ruleName: 'Missing Glucose Test Flag',
          triggered: true,
          priority: 'medium',
          reason: 'ब्लड शुगर जांच नहीं की गई है।',
          source: 'NCD Workflow Check',
          nextWorkflow: 'अगली विजिट में ब्लड ग्लूकोज जांच पूरी करें।'
        });
      }
    } else if (record.screening_type === 'PREGNANCY') {
      const data = record.structured_data as PregnancyScreeningData;

      if (pregnancyConfig.danger_signs.enabled) {
        const detectedSigns: string[] = [];

        if (data.vaginal_bleeding.value) detectedSigns.push('योनि से रक्तस्राव (Vaginal Bleeding)');
        if (data.severe_headache.value) detectedSigns.push('अत्यधिक तेज सिरदर्द');
        if (data.blurred_vision.value) detectedSigns.push('धुंधला दिखाई देना');
        if (data.severe_abdominal_pain.value) detectedSigns.push('पेट में तेज असहनीय दर्द');
        if (data.reduced_fetal_movement.value) detectedSigns.push('गर्भस्थ शिशु की हलचल में कमी');

        const hasDangerSign = detectedSigns.length > 0;

        results.push({
          ruleId: 'PREGNANCY_DANGER_SIGNS',
          ruleName: 'Maternal Danger Signs Rule',
          triggered: hasDangerSign,
          priority: hasDangerSign ? 'high' : 'low',
          reason: hasDangerSign
            ? `${pregnancyConfig.danger_signs.reason}: ${detectedSigns.join(', ')}`
            : 'कोई खतरे के लक्षण उपस्थित नहीं पाए गए।',
          source: pregnancyConfig.danger_signs.source,
          nextWorkflow: hasDangerSign
            ? pregnancyConfig.danger_signs.nextWorkflow
            : 'नियमित प्रसव पूर्व जांच (ANC) कार्यक्रम जारी रखें।'
        });
      }
    }

    return results;
  }
}

export const defaultRuleEngine = new RuleEngine();
