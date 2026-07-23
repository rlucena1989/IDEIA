export interface PromptDefinition {
  id: string;
  role: string;
  goal: string;
  rules: string[];
  flow: string[];
  output: string[];
  version: string;
}

export interface PromptContext {
  state?: Record<string, unknown>;
  productName?: string;
  productType?: string;
  gaps?: string[];
  artifacts?: string[];
}

export interface RenderedPrompt {
  id: string;
  content: string;
  version: string;
  renderedAt: string;
}
