import { ComplexityLevel, RouteDecision } from './types';
import { createLogger } from '@ideia/logger';
import { selectRoute } from './route-selector';
import { composePrompt, composeMinimalPrompt, PromptSpec } from './prompt-composer';
import { compressSmart } from './context-compressor';

export interface RoutedPrompt {
  prompt: string;
  originalLength: number;
  compressedLength: number;
  compressionRatio: number;
  route: RouteDecision;
}

export function routePrompt(spec: PromptSpec, mode: 'fast' | 'balanced' | 'deep'): RoutedPrompt {
  const fullPrompt = composePrompt(spec);
  const minimal = composeMinimalPrompt(spec);

  const route = selectRoute(fullPrompt, mode);
  const compressed = compressSmart(route.target === 'local' ? minimal : fullPrompt);

  return {
    prompt: compressed.compressed,
    originalLength: fullPrompt.length,
    compressedLength: compressed.compressed.length,
    compressionRatio: compressed.ratio,
    route
  };
}
