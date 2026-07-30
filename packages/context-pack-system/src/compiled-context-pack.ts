import { ContextPack, CompiledPack, CompilationConfig, CompilationMetadata } from './types';
import { createLogger } from '@ideia/logger';
import { ContextPackRegistry } from './context-pack-registry';
const logger = createLogger('compiled-context-pack');

export class CompiledContextPack {
  private _compilationCache = new Map<string, CompiledPack>();

  constructor(private _config: CompilationConfig = {
    compressionRatio: 0.3,
    minQualityPreservation: 0.85,
    tokenReductionTarget: 4096,
    maxIterations: 5,
    preserveP0: true,
  }) {}

  private _extractKeyStatements(content: string): string[] {
    const statements: string[] = [];
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.replace(/^[#\s*\-•]+/, '').trim();
      if (!trimmed || trimmed.length < 10) continue;

      const verbs = ['use', 'ensure', 'never', 'always', 'implement', 'follow', 'avoid', 'prefer', 'include'];
      const hasVerb = verbs.some(v => trimmed.toLowerCase().includes(v));
      if (hasVerb) statements.push(trimmed);
    }
    return statements;
  }

  private _deduplicateStatements(statements: string[][]): string[] {
    const all = statements.flat();
    const unique: string[] = [];
    const seen = new Set<string>();

    for (const s of all) {
      const normalized = s.toLowerCase().replace(/\s+/g, ' ').trim();
      const isDuplicate = Array.from(seen).some(existing => {
        const longer = normalized.length > existing.length ? normalized : existing;
        const shorter = normalized.length > existing.length ? existing : normalized;
        return longer.includes(shorter);
      });

      if (!isDuplicate) {
        seen.add(normalized);
        unique.push(s);
      }
    }

    return unique;
  }

  private _prioritizeStatements(statements: string[], packs: ContextPack[]): string[] {
    const sectionPriorityMap = new Map<string, string>();
    for (const pack of packs) {
      for (const section of pack.sections) {
        for (const stmt of this._extractKeyStatements(section.content)) {
          const existing = sectionPriorityMap.get(stmt);
          if (!existing || section.priority === 'P0') {
            sectionPriorityMap.set(stmt, section.priority);
          }
        }
      }
    }

    const order: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
    return statements.sort((a, b) => {
      const pA = order[sectionPriorityMap.get(a) || 'P2'] ?? 2;
      const pB = order[sectionPriorityMap.get(b) || 'P2'] ?? 2;
      return pA - pB;
    });
  }

  private _estimateTokens(text: string): number {
    return Math.ceil(text.length * 0.25);
  }

  async compile(packs: ContextPack[], compilationName: string): Promise<CompiledPack> {
    const cacheKey = packs.map(p => `${p.name}@${p.version}`).sort().join('+');
    const cached = this._compilationCache.get(cacheKey);
    if (cached) return cached;

    const originalTokens = packs.reduce(
      (s, p) => s + (p.totalTokens || this._estimateTokens(p.sections.map(sc => sc.content).join('\n'))),
      0
    );
    const targetTokens = Math.min(
      this._config.tokenReductionTarget,
      Math.ceil(originalTokens * this._config.compressionRatio)
    );

    let compiledSections: string[] = [];
    let iteration = 0;
    let qualityScore = 0;

    while (iteration < this._config.maxIterations) {
      const allStatements = packs.map(p =>
        this._extractKeyStatements(p.sections.map(sc => sc.content).join('\n'))
      );
      let uniqueStatements = this._deduplicateStatements(allStatements);
      uniqueStatements = this._prioritizeStatements(uniqueStatements, packs);

      let tokenBudget = targetTokens;
      const included: string[] = [];
      for (const stmt of uniqueStatements) {
        const stmtTokens = this._estimateTokens(stmt);
        if (stmtTokens <= tokenBudget) {
          included.push(stmt);
          tokenBudget -= stmtTokens;
        }
      }

      const p0Sections = packs.flatMap(p => p.sections.filter(s => s.priority === 'P0'));
      const p0Covered = p0Sections.filter(s =>
        included.some(stmt => s.content.includes(stmt.slice(0, 30)))
      ).length;
      qualityScore = p0Sections.length > 0 ? p0Covered / p0Sections.length : 0.9;

      if (qualityScore >= this._config.minQualityPreservation || iteration === this._config.maxIterations - 1) {
        compiledSections = included;
        break;
      }

      iteration++;
    }

    const compiledTokens = this._estimateTokens(compiledSections.join('\n'));

    const compilationMetadata: CompilationMetadata = {
      sourcePacks: packs.map(p => p.name),
      originalTokens,
      compiledTokens,
      compressionRatio: compiledTokens / Math.max(originalTokens, 1),
      qualityScore,
      distillationTimestamp: new Date().toISOString(),
      preservedSections: packs.flatMap(p =>
        p.sections.filter(s => s.priority === 'P0').map(s => s.id)
      ),
    };

    const compiled: CompiledPack = {
      name: compilationName,
      version: '1.0.0',
      description: `Compiled context pack from ${packs.map(p => p.name).join(', ')}`,
      tags: ['compiled', 'distilled', ...packs.flatMap(p => p.tags || [])],
      categories: ['compiled'],
      level: 'intermediate',
      variables: packs.flatMap(p => p.variables || []).slice(0, 10).map(v => ({
        ...v,
        required: false,
      })),
      sections: [{
        id: 'compiled_context',
        title: `Compiled Context (${compilationName})`,
        format: 'markdown',
        priority: 'P0',
        content: compiledSections.map((s, i) => `${i + 1}. ${s}`).join('\n'),
        maxTokens: compiledTokens,
      }],
      dependencies: packs.map(p => ({
        pack: p.name,
        version: `^${p.version}`,
        required: false,
        description: 'source pack',
      })),
      slicing: [
        { maxTokens: 2048, strategy: 'truncate' },
        { maxTokens: 4096, strategy: 'priority' },
      ],
      hooks: [],
      examples: [],
      compilationMetadata,
    };

    this._compilationCache.set(cacheKey, compiled);
    return compiled;
  }

  async compileFrequentCombinations(registry: ContextPackRegistry): Promise<CompiledPack[]> {
    const frequentCombos = [
      ['ideia-introduction', 'bugfix', 'coding-standards'],
      ['ideia-introduction', 'bugfix', 'security-review'],
      ['ideia-introduction', 'security-review', 'compliance'],
      ['ideia-introduction', 'refactor'],
      ['ideia-introduction', 'coding-standards'],
    ];

    const compiled: CompiledPack[] = [];
    for (const combo of frequentCombos) {
      const packs: ContextPack[] = [];
      for (const name of combo) {
        const pack = await registry.get(name);
        if (pack) packs.push(pack);
      }
      if (packs.length >= 2) {
        const name = `compiled-${combo.join('-')}`;
        compiled.push(await this.compile(packs, name));
      }
    }
    return compiled;
  }
}
