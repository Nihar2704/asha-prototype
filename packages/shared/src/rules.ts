export type PriorityLevel = 'low' | 'medium' | 'high';

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  priority: PriorityLevel;
  reason: string;
  source: string;
  nextWorkflow: string;
}

export interface NCDProtocolConfig {
  protocol: string;
  version: string;
  bp: {
    high_reading_rule: {
      enabled: boolean;
      systolic_threshold: number;
      diastolic_threshold: number;
      source: string;
      reason: string;
      nextWorkflow: string;
    };
  };
  glucose: {
    high_reading_rule: {
      enabled: boolean;
      glucose_threshold: number;
      source: string;
      reason: string;
      nextWorkflow: string;
    };
  };
}

export interface PregnancyProtocolConfig {
  protocol: string;
  version: string;
  danger_signs: {
    enabled: boolean;
    source: string;
    reason: string;
    nextWorkflow: string;
    tracked_signs: string[];
  };
}
