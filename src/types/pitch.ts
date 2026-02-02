export interface PitchConfig {
  length: 'short' | 'medium' | 'long';
  tone: 'formal' | 'conversational' | 'technical';
  products: string[];
  competitors: string[];
  additionalInstructions: string;
  includeObjections: boolean;
  includeTalkingPoints: boolean;
  focusArea: 'general' | 'service' | 'innovation' | 'price' | 'loyalty';
}

export interface PitchSection {
  id: 'hook' | 'proposition' | 'competition' | 'cta' | 'objections' | 'talking_points' | 'follow_up';
  title: string;
  icon: string;
  content: string;
}

export interface GeneratedPitch {
  sections: PitchSection[];
  fullText: string;
  practitionerId: string;
  practitionerName: string;
  generatedAt: Date;
  config: PitchConfig;
}

export interface PitchHistory {
  pitches: GeneratedPitch[];
  lastUpdated: Date;
}
