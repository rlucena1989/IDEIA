export class StyleGANAttackMixer {
  private _attackTypeStyles: Map<number, number[]> = new Map();

  constructor(
    private _embedDim = 768,
    private _styleDim = 256,
    numAttackTypes = 7
  ) {
    for (let i = 0; i < numAttackTypes; i++) {
      this._attackTypeStyles.set(i, Array.from({ length: _styleDim }, () => Math.random() * 0.1));
    }
  }

  interpolateAttacks(attackTypeA: number, attackTypeB: number, alpha = 0.5): number[] {
    const styleA = this._attackTypeStyles.get(attackTypeA) ?? [];
    const styleB = this._attackTypeStyles.get(attackTypeB) ?? [];
    const mixedStyle = styleA.map((s, i) => (1 - alpha) * s + alpha * (styleB[i] ?? 0));
    return this._synthesize(mixedStyle);
  }

  styleMixing(coarseType: number, fineTypes: number[], nSamples = 8): number[][] {
    const coarseStyle = this._attackTypeStyles.get(coarseType) ?? [];
    const results: number[][] = [];
    for (let i = 0; i < nSamples; i++) {
      const fineType = fineTypes[Math.floor(Math.random() * fineTypes.length)];
      const fineStyle = this._attackTypeStyles.get(fineType) ?? [];
      const mixed = coarseStyle.map((s, j) => s + (fineStyle[j] ?? 0) * 0.3);
      results.push(this._synthesize(mixed));
    }
    return results;
  }

  truncationTrick(attackType: number, psi = 0.7): number[] {
    const style = this._attackTypeStyles.get(attackType) ?? [];
    const meanVal = style.reduce((a, b) => a + b, 0) / style.length;
    const truncated = style.map(s => meanVal + psi * (s - meanVal));
    return this._synthesize(truncated);
  }

  generateAttackFamily(baseType: number, nVariants = 10, diversity = 0.3): number[][] {
    const base = this.truncationTrick(baseType, 0.8);
    const variants: number[][] = [];
    for (let i = 0; i < nVariants; i++) {
      const noise = base.map(v => v + (Math.random() - 0.5) * diversity);
      variants.push(noise.map(v => Math.tanh(v)));
    }
    return variants;
  }

  private _synthesize(style: number[]): number[] {
    const result: number[] = [];
    for (let i = 0; i < this._embedDim; i++) {
      const styleIdx = i % style.length;
      result.push(Math.tanh(style[styleIdx] ?? 0));
    }
    return result;
  }
}
