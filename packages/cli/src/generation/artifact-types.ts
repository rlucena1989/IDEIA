export interface GenerationScope {
  productName: string;
  productType: 'cli' | 'extension' | 'library' | 'service' | 'workspace';
  goals: string[];
  requiredArtifacts: string[];
  tone?: 'technical' | 'executive' | 'mixed';
}

export interface PlannedArtifact {
  path: string;
  title: string;
  sections: string[];
  priority: 'high' | 'medium' | 'low';
  generated: boolean;
}

export interface GenerationPlan {
  scope: GenerationScope;
  artifacts: PlannedArtifact[];
  missingArtifacts: string[];
}
