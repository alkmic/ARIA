export interface PitchConfig {
  length: 'short' | 'medium' | 'long';
  tone: 'formal' | 'conversational' | 'technical';
  products: string[];
  competitors: string[];
  additionalInstructions: string;
}

export interface PitchSection {
  id: 'hook' | 'proposition' | 'competition' | 'cta';
  title: string;
  icon: string;
  content: string;
}

export interface GeneratedPitch {
  sections: PitchSection[];
  fullText: string;
  practitionerId: string;
  generatedAt: Date;
  config: PitchConfig;
}
