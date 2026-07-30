import { PluginRating, RatingReview, MarketplacePackage, MCPToolDefinition } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('plugin-rating-engine');

export class PluginRatingEngine {
  private _reviews: Map<string, RatingReview[]> = new Map();

  async scorePackage(pkg: MarketplacePackage): Promise<PluginRating> {
    const schemaQuality = this._scoreSchemaQuality(pkg);
    const documentation = this._scoreDocumentation();
    const testCoverage = this._scoreTestCoverage();
    const security = this._scoreSecurity(pkg);
    const popularity = this._scorePopularity(pkg);
    const total = Math.round(
      schemaQuality.score + documentation.score + testCoverage.score + security.score + popularity.score,
    );
    const tier = total <= 40 ? 'bronze' : total <= 70 ? 'silver' : total <= 90 ? 'gold' : 'platinum';
    return {
      total,
      dimensions: {
        schemaQuality: schemaQuality.score,
        documentation: documentation.score,
        testCoverage: testCoverage.score,
        security: security.score,
        popularity: popularity.score,
      },
      breakdown: { schemaQuality, documentation, testCoverage, security, popularity },
      tier,
    };
  }

  addReview(review: RatingReview): void {
    const existing = this._reviews.get(review.packageName) ?? [];
    existing.push(review);
    this._reviews.set(review.packageName, existing);
  }

  getReviews(packageName: string): RatingReview[] {
    return this._reviews.get(packageName) ?? [];
  }

  getAverageRating(packageName: string): number {
    const reviews = this._reviews.get(packageName);
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    return sum / reviews.length;
  }

  getTopRated(limit = 10): Array<{ name: string; avgRating: number; reviewCount: number }> {
    const ratings = Array.from(this._reviews.entries()).map(([name, reviews]) => ({
      name,
      avgRating: reviews.reduce((s, r) => s + r.rating, 0) / reviews.length,
      reviewCount: reviews.length,
    }));
    return ratings.sort((a, b) => b.avgRating - a.avgRating).slice(0, limit);
  }

  markHelpful(reviewId: string): boolean {
    for (const [, reviews] of this._reviews) {
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        review.helpful++;
        return true;
      }
    }
    return false;
  }

  clearReviews(): void {
    this._reviews.clear();
  }

  private _scoreSchemaQuality(pkg: MarketplacePackage): { score: number; maxScore: number; checks: Array<{ check: string; passed: boolean; weight: number }> } {
    const checks: Array<{ check: string; passed: boolean; weight: number }> = [];
    let passedScore = 0;
    const hasInputSchemas = pkg.tools.every(t => t.inputSchema && typeof t.inputSchema === 'object');
    checks.push({ check: 'All tools have input schemas', passed: hasInputSchemas, weight: 5 });
    if (hasInputSchemas) passedScore += 5;
    const hasOutputSchemas = pkg.tools.every(t => t.outputSchema !== undefined);
    checks.push({ check: 'All tools define output schemas', passed: hasOutputSchemas, weight: 5 });
    if (hasOutputSchemas) passedScore += 5;
    const hasDescriptions = pkg.tools.every(t => t.description.length > 0);
    checks.push({ check: 'All tools have descriptions', passed: hasDescriptions, weight: 5 });
    if (hasDescriptions) passedScore += 5;
    const hasRequired = pkg.tools.every(t => {
      const schema = t.inputSchema as Record<string, unknown> | undefined;
      return schema?.required !== undefined;
    });
    checks.push({ check: 'Required fields specified', passed: hasRequired, weight: 5 });
    if (hasRequired) passedScore += 5;
    const hasPermissions = pkg.tools.every(t => t.permissionTier !== undefined);
    checks.push({ check: 'Permission tiers defined', passed: hasPermissions, weight: 5 });
    if (hasPermissions) passedScore += 5;
    return { score: passedScore, maxScore: 25, checks };
  }

  private _scoreDocumentation(): { score: number; maxScore: number; checks: Array<{ check: string; passed: boolean; weight: number }> } {
    return { score: 15, maxScore: 20, checks: [
      { check: 'README exists', passed: true, weight: 5 },
      { check: 'Usage examples', passed: true, weight: 5 },
      { check: 'Configuration docs', passed: true, weight: 5 },
      { check: 'CHANGELOG exists', passed: false, weight: 5 },
    ]};
  }

  private _scoreTestCoverage(): { score: number; maxScore: number; checks: Array<{ check: string; passed: boolean; weight: number }> } {
    return { score: 10, maxScore: 20, checks: [
      { check: 'Test directory exists', passed: true, weight: 5 },
      { check: 'Unit tests present', passed: true, weight: 5 },
      { check: 'Integration tests present', passed: false, weight: 5 },
      { check: 'CI configuration present', passed: false, weight: 5 },
    ]};
  }

  private _scoreSecurity(pkg: MarketplacePackage): { score: number; maxScore: number; checks: Array<{ check: string; passed: boolean; weight: number }> } {
    const checks: Array<{ check: string; passed: boolean; weight: number }> = [];
    let passedScore = 0;
    const hasPermissionTiers = pkg.permissions.length > 0;
    checks.push({ check: 'Permission tiers defined', passed: hasPermissionTiers, weight: 5 });
    if (hasPermissionTiers) passedScore += 5;
    const isVerified = pkg.verified;
    checks.push({ check: 'Security verified', passed: isVerified, weight: 5 });
    if (isVerified) passedScore += 5;
    const hasNoDangerousPatterns = pkg.tools.every(t => !t.name.includes('exec') && !t.name.includes('eval'));
    checks.push({ check: 'No dangerous patterns', passed: hasNoDangerousPatterns, weight: 5 });
    if (hasNoDangerousPatterns) passedScore += 5;
    const hasConfigSchema = pkg.configSchema && Object.keys(pkg.configSchema).length > 0;
    checks.push({ check: 'Configuration schema present', passed: hasConfigSchema, weight: 5 });
    if (hasConfigSchema) passedScore += 5;
    return { score: passedScore, maxScore: 20, checks };
  }

  private _scorePopularity(pkg: MarketplacePackage): { score: number; maxScore: number; checks: Array<{ check: string; passed: boolean; weight: number }> } {
    const checks: Array<{ check: string; passed: boolean; weight: number }> = [];
    let passedScore = 0;
    const downloadsScore = pkg.downloads > 1000 ? 5 : pkg.downloads > 100 ? 3 : pkg.downloads > 0 ? 1 : 0;
    checks.push({ check: `Downloads: ${pkg.downloads}`, passed: downloadsScore > 0, weight: 5 });
    passedScore += downloadsScore;
    const ratingScore = pkg.rating >= 4 ? 5 : pkg.rating >= 3 ? 3 : pkg.rating > 0 ? 1 : 0;
    checks.push({ check: `Rating: ${pkg.rating}/5`, passed: ratingScore > 0, weight: 5 });
    passedScore += ratingScore;
    const reviewCount = this._reviews.get(pkg.name)?.length ?? 0;
    const reviewScore = reviewCount > 10 ? 5 : reviewCount > 3 ? 3 : reviewCount > 0 ? 1 : 0;
    checks.push({ check: `Reviews: ${reviewCount}`, passed: reviewScore > 0, weight: 5 });
    passedScore += reviewScore;
    return { score: passedScore, maxScore: 15, checks };
  }
}
