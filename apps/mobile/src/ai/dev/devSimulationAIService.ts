import { LocalAIService, TranscriptionResult, ExtractionResult, SummaryResult } from '../types';
import {
  ScreeningType,
  VerifiedScreeningRecord,
  RuleResult,
  NCDScreeningData,
  PregnancyScreeningData
} from '@asha/shared';

export class DevSimulationAIService implements LocalAIService {
  private defaultTranscript: string;

  constructor(defaultTranscript?: string) {
    this.defaultTranscript =
      defaultTranscript ||
      'इनका नाम सुनीता देवी है, उम्र पैंतालीस साल है। बीपी एक सौ साठ बटा एक सौ है और शुगर दो सौ दस आई थी।';
  }

  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    // Simulates Whisper Tiny Hindi transcription
    return {
      transcript: this.defaultTranscript,
      durationSeconds: 1.2,
      confidence: 0.95
    };
  }

  async extractScreeningData(transcript: string, screeningType: ScreeningType): Promise<ExtractionResult> {
    const uncertainFields: string[] = [];
    const missingFields: string[] = [];

    // Check for uncertain language: शायद (perhaps), लग रहा है (seems like)
    const isUncertain = transcript.includes('शायद') || transcript.includes('लगता है');

    if (screeningType === 'NCD') {
      // Extract numbers (BP systolic/diastolic, glucose)
      // Handles 160/100 or 'एक सौ साठ बटा एक सौ'
      let systolic: number | null = null;
      let diastolic: number | null = null;
      let glucose: number | null = null;

      const slashMatch = transcript.match(/(\d{2,3})\s*[\/ बटा]\s*(\d{2,3})/);
      if (slashMatch) {
        systolic = parseInt(slashMatch[1], 10);
        diastolic = parseInt(slashMatch[2], 10);
      } else if (transcript.includes('एक सौ साठ') || transcript.includes('160')) {
        systolic = 160;
        if (transcript.includes('एक सौ') || transcript.includes('100')) {
          diastolic = 100;
        }
      } else if (transcript.includes('120') && transcript.includes('80')) {
        systolic = 120;
        diastolic = 80;
      }

      if (transcript.includes('दो सौ दस') || transcript.includes('210')) {
        glucose = 210;
      } else if (transcript.includes('शुगर नहीं') || transcript.includes('शुगर नहीं ली')) {
        glucose = null;
      } else {
        const glucoseMatch = transcript.match(/(?:शुगर|glucose|sugar)\s*(?:है|आया|था)?\s*(\d{2,3})/i);
        if (glucoseMatch) {
          glucose = parseInt(glucoseMatch[1], 10);
        }
      }

      const hasTobacco = transcript.includes('तंबाकू') || transcript.includes('बीड़ी') || transcript.includes('गुटखा');
      const hasAlcohol = transcript.includes('शराब') || transcript.includes('दारू');
      const hasDiabetesHistory = transcript.includes('शुगर की बीमारी') || transcript.includes('मधुमेह');
      const hasBPHistory = transcript.includes('बीपी की मरीज');

      if (systolic === null) missingFields.push('bp_systolic');
      if (diastolic === null) missingFields.push('bp_diastolic');
      if (glucose === null) missingFields.push('blood_glucose');
      if (isUncertain && systolic !== null) uncertainFields.push('bp_systolic');

      const data: NCDScreeningData = {
        bp_systolic: {
          value: systolic,
          status: systolic !== null ? (isUncertain ? 'uncertain' : 'known') : 'missing'
        },
        bp_diastolic: {
          value: diastolic,
          status: diastolic !== null ? (isUncertain ? 'uncertain' : 'known') : 'missing'
        },
        blood_glucose: {
          value: glucose,
          status: glucose !== null ? 'known' : 'missing'
        },
        tobacco_use: { value: hasTobacco, status: 'known' },
        alcohol_use: { value: hasAlcohol, status: 'known' },
        known_hypertension: { value: hasBPHistory, status: 'known' },
        known_diabetes: { value: hasDiabetesHistory, status: 'known' },
        medication_adherence: {
          value: transcript.includes('दवाई नहीं') ? 'non-adherent' : 'adherent',
          status: 'known'
        },
        symptoms: {
          value: transcript.includes('सिरदर्द') ? ['सिरदर्द'] : [],
          status: 'known'
        }
      };

      return { structuredData: data, uncertainFields, missingFields };
    } else {
      // Pregnancy screening
      const hasBleeding = transcript.includes('खून') || transcript.includes('bleeding');
      const hasHeadache = transcript.includes('तेज सिरदर्द') || transcript.includes('चक्कर');
      const hasAbdominalPain = transcript.includes('पेट में तेज दर्द') || transcript.includes('दर्द');
      const hasSwelling = transcript.includes('सूजन') || transcript.includes('पैरों में सूजन');

      let weeks = 28;
      const weeksMatch = transcript.match(/(\d{1,2})\s*(?:हफ्ते|सप्ताह|महीने)/);
      if (weeksMatch) {
        const val = parseInt(weeksMatch[1], 10);
        weeks = transcript.includes('महीने') ? val * 4 : val;
      }

      const data: PregnancyScreeningData = {
        pregnancy_status: { value: true, status: 'known' },
        gestational_age_weeks: { value: weeks, status: 'known' },
        vaginal_bleeding: { value: hasBleeding, status: 'known' },
        severe_headache: { value: hasHeadache, status: 'known' },
        blurred_vision: { value: false, status: 'known' },
        severe_abdominal_pain: { value: hasAbdominalPain, status: 'known' },
        reduced_fetal_movement: { value: false, status: 'known' },
        swelling: { value: hasSwelling, status: 'known' },
        fever: { value: transcript.includes('बुखार'), status: 'known' },
        follow_up_required: { value: false, status: 'known' }
      };

      return { structuredData: data, uncertainFields, missingFields };
    }
  }

  async generateSummary(
    verifiedRecord: VerifiedScreeningRecord,
    ruleResults: RuleResult[]
  ): Promise<SummaryResult> {
    const highPriorityFlags = ruleResults.filter((r) => r.triggered && r.priority === 'high');
    const isHigh = highPriorityFlags.length > 0;

    let summaryText = 'आज की स्क्रीनिंग पूरी हुई।\n';

    if (verifiedRecord.screening_type === 'NCD') {
      const data = verifiedRecord.structured_data as NCDScreeningData;
      if (data.bp_systolic.value && data.bp_diastolic.value) {
        summaryText += `• BP: ${data.bp_systolic.value}/${data.bp_diastolic.value}\n`;
      }
      if (data.blood_glucose.value) {
        summaryText += `• Blood Sugar: ${data.blood_glucose.value} mg/dL\n`;
      }
    }

    if (isHigh) {
      summaryText += '\n⚠️ उच्च प्राथमिकता स्क्रीनिंग नियम ट्रिगर हुआ है। प्रोटोकॉल के अनुसार रेफरल या फॉलो-अप प्रक्रिया करें।';
    } else {
      summaryText += '\nसभी माप सामान्य सीमा में हैं। नियमित फॉलो-अप जारी रखें।';
    }

    return {
      summary: summaryText,
      generatedAt: new Date().toISOString()
    };
  }
}
