export interface ProductScope {
  productName: string;
  productType: 'cli' | 'extension' | 'library' | 'service' | 'platform';
  goal: string;
  summary: string;
  priorities: string[];
  constraints: string[];
}

export interface ProductArtifactSpec {
  path: string;
  title: string;
  purpose: string;
  sections: string[];
  required: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface ProductPlan {
  scope: ProductScope;
  artifacts: ProductArtifactSpec[];
  gaps: string[];
  confidence: number;
}
