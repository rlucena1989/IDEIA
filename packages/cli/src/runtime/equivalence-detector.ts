/**
 * @deprecated Use `packages/diff-engine` — consolidated import.
 * Semantic code equivalence detection.
 */
import { detectEquivalence as de, DEFAULT_EQUIVALENCE_CONFIG as defCfg } from '@ideia/diff-engine';

export const detectEquivalence = de;
export const DEFAULT_EQUIVALENCE_CONFIG = defCfg;
export type { EquivalenceResult, EquivalenceConfig } from '@ideia/diff-engine';
