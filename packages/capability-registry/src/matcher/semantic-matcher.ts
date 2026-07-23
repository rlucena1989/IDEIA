import type { CapabilityCategory, CapabilityMatch } from '../types/capability';
import type { ICapabilityRegistry } from '../registry/registry.interface';
import type { ICapabilityMatcher, MatchRequest } from './matcher.interface';

export class SemanticCapabilityMatcher implements ICapabilityMatcher {
  private readonly WEIGHTS = { semantic: 0.40, tag: 0.25, type: 0.20, version: 0.15 };

  constructor(private registry: ICapabilityRegistry) {}

  async match(request: MatchRequest): Promise<CapabilityMatch[]> {
    const candidates = await this.registry.list({ category: request.category as CapabilityCategory, tags: request.tags, status: 'active' });
    const scored: CapabilityMatch[] = [];

    for (const cap of candidates) {
      const reasons: string[] = [];
      let score = 0;

      const semanticScore = request.text ? this.textSimilarity(request.text, cap.name + ' ' + cap.description) : 0;
      reasons.push(`semantic:${semanticScore.toFixed(3)}`);
      score += semanticScore * this.WEIGHTS.semantic;

      let tagScore = 0;
      if (request.tags?.length) {
        const matched = request.tags.filter(t => cap.tags.includes(t)).length;
        tagScore = matched / request.tags.length;
        if (matched > 0) reasons.push(`tags:${matched}/${request.tags.length}`);
      }
      score += tagScore * this.WEIGHTS.tag;

      let typeScore = 0;
      if (request.inputTypes?.length) {
        const capInputTypes = new Set(cap.inputs.map(i => i.type));
        const matched = request.inputTypes.filter(t => capInputTypes.has(t)).length;
        typeScore = matched / request.inputTypes.length;
        if (matched > 0) reasons.push(`types:${matched}/${request.inputTypes.length}`);
      }
      score += typeScore * this.WEIGHTS.type;

      let versionScore = 1.0;
      if (request.versionMin) {
        versionScore = this.checkVersionConstraint(cap.version, request.versionMin) ? 1.0 : 0.0;
        if (versionScore === 0) reasons.push('version-incompatible');
      }
      score += versionScore * this.WEIGHTS.version;

      if (cap.status === 'deprecated') { score *= 0.3; reasons.push('deprecated-penalty'); }
      if (score > 0) scored.push({ capability: cap, score, matchReasons: reasons });
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, request.limit || 5);
  }

  async matchExact(id: string): Promise<CapabilityMatch | null> {
    const cap = await this.registry.get(id);
    return cap ? { capability: cap, score: 1.0, matchReasons: ['exact-match'] } : null;
  }

  async getSimilar(id: string, limit = 5): Promise<CapabilityMatch[]> {
    const cap = await this.registry.get(id);
    return cap ? this.match({ text: `${cap.name} ${cap.description}`, tags: cap.tags, category: cap.category, limit }) : [];
  }

  private textSimilarity(a: string, b: string): number {
    const aWords = new Set(a.toLowerCase().split(/\W+/));
    const bWords = new Set(b.toLowerCase().split(/\W+/));
    let intersection = 0;
    for (const word of aWords) { if (bWords.has(word)) intersection++; }
    const union = aWords.size + bWords.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private checkVersionConstraint(capVersion: string, minVersion: string): boolean {
    const capParts = capVersion.split('.').map(Number);
    const minParts = minVersion.replace('>=', '').split('.').map(Number);
    for (let i = 0; i < Math.max(capParts.length, minParts.length); i++) {
      const capP = capParts[i] || 0;
      const minP = minParts[i] || 0;
      if (capP < minP) return false;
      if (capP > minP) return true;
    }
    return true;
  }
}
