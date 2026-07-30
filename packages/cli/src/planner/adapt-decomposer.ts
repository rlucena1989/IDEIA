/**
 * adapt-decomposer.ts — Decomposição Adaptativa ADAPT-Style (Item 5)
 *
 * Decompõe tarefas recursivamente com profundidade máxima 3.
 * Cada nível verifica executabilidade antes de decompor.
 * Fallback progressivo: CoT → P&S → ReAct.
 */

import { randomUUID } from 'crypto';
import { createLogger } from '@ideia/logger';

export interface DecomposedTask {
  id: string;
  title: string;
  description: string;
  depth: number;
  subtasks: DecomposedTask[];
  executable: boolean;
  dependencies: string[];
  suggestedApproach: 'cot' | 'ps' | 'react';
}

const MAX_DEPTH = 3;
const APPROACHES: Array<'cot' | 'ps' | 'react'> = ['cot', 'ps', 'react'];

export class AdaptDecomposer {
  async decompose(spec: { title: string; description: string }, depth = 0): Promise<DecomposedTask> {
    const id = randomUUID().slice(0, 8);
    const isExecutable = depth >= MAX_DEPTH || this.isSimpleEnough(spec, depth);

    if (isExecutable) {
      return {
        id,
        title: spec.title,
        description: spec.description,
        depth,
        subtasks: [],
        executable: true,
        dependencies: [],
        suggestedApproach: this.selectApproach(spec, depth),
      };
    }

    const parts = this.splitTask(spec);
    const subResults = await Promise.all(parts.map(p => this.decompose(p, depth + 1)));
    for (let i = 1; i < subResults.length; i++) {
      if (subResults[i]) subResults[i].dependencies.push(subResults[i - 1].id);
    }

    return {
      id,
      title: spec.title,
      description: spec.description,
      depth,
      subtasks: subResults,
      executable: false,
      dependencies: [],
      suggestedApproach: 'cot',
    };
  }

  private isSimpleEnough(spec: { title: string; description: string }, depth: number): boolean {
    if (depth >= MAX_DEPTH) return true;
    const fullText = `${spec.title} ${spec.description}`;
    const complexity = fullText.split(' ').length;
    if (complexity < 30) return true;
    const actionVerbs = ['create', 'add', 'fix', 'update', 'remove', 'rename'];
    const wordCount = spec.title.split(' ').length;
    if (wordCount <= 4 && actionVerbs.some(v => spec.title.toLowerCase().includes(v))) return true;
    return false;
  }

  private splitTask(spec: { title: string; description: string }): Array<{ title: string; description: string }> {
    const sentences = spec.description.split(/[.;]\s*/).filter(s => s.trim());
    if (sentences.length <= 1) {
      const words = spec.description.split(' ');
      const mid = Math.ceil(words.length / 2);
      return [
        { title: `Prepare: ${spec.title}`, description: words.slice(0, mid).join(' ') },
        { title: `Complete: ${spec.title}`, description: words.slice(mid).join(' ') },
      ];
    }
    return sentences.slice(0, 5).map((s, i) => ({
      title: `${i === 0 ? 'Analyze' : i === 1 ? 'Implement' : 'Verify'}: ${spec.title}`,
      description: s.trim(),
    }));
  }

  private selectApproach(spec: { title: string; description: string }, depth: number): 'cot' | 'ps' | 'react' {
    const approach = APPROACHES[depth % APPROACHES.length];
    return approach;
  }
}
