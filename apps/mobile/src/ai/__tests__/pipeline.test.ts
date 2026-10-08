import { ScreeningPipelineOrchestrator } from '../pipelineOrchestrator';
import { DevSimulationAIService } from '../dev/devSimulationAIService';
import { RuleEngine } from '../../rules/engine';

describe('Voice Screening Pipeline End-to-End Orchestrator', () => {
  it('should process Hindi speech to validated record, rule flags, and summary (Normal Scenario)', async () => {
    const aiService = new DevSimulationAIService(
      'इनका नाम सुनीता देवी है, उम्र 45 साल है। बीपी 120/80 है और शुगर 110 आई थी।'
    );
    const orchestrator = new ScreeningPipelineOrchestrator(aiService, new RuleEngine());

    const result = await orchestrator.processVoiceScreening('dummy/path/audio.wav', 'NCD', 'patient_123');

    expect(result.transcript).toBeDefined();
    expect(result.verifiedRecord.screening_type).toBe('NCD');
    expect(result.ruleResults.length).toBeGreaterThan(0);
    expect(result.hasHighPriority).toBe(false);
    expect(result.summary).toContain('स्क्रीनिंग पूरी हुई');
  });

  it('should process Hindi speech with high BP to high-priority rule flag and explanation', async () => {
    const aiService = new DevSimulationAIService(
      'इनका नाम सुनीता देवी है, उम्र पैंतालीस साल है। बीपी एक सौ साठ बटा एक सौ है और शुगर दो सौ दस आई थी।'
    );
    const orchestrator = new ScreeningPipelineOrchestrator(aiService, new RuleEngine());

    const result = await orchestrator.processVoiceScreening('dummy/path/audio.wav', 'NCD', 'patient_456');

    expect(result.transcript).toContain('सुनीता देवी');
    expect(result.hasHighPriority).toBe(true);

    const bpRule = result.ruleResults.find((r) => r.ruleId === 'NCD_BP_EVALUATION');
    expect(bpRule?.priority).toBe('high');
    expect(bpRule?.triggered).toBe(true);
    expect(result.summary).toContain('उच्च प्राथमिकता');
  });
});
