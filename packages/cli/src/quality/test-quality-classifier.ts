import path from 'node:path';
import { createLogger } from '@ideia/logger';
import { getIO } from '../io';
const logger = createLogger('test-quality-classifier');

export type QualityLevel = 'excellent' | 'good' | 'needs_improvement' | 'poor' | 'missing';

export interface QualityMetrics {
  hasDescribe: boolean;
  hasIt: boolean;
  hasExpect: boolean;
  assertionCount: number;
  hasAaaPattern: boolean;
  hasEdgeCases: boolean;
  hasErrorTests: boolean;
  hasBoundaryTests: boolean;
  hasMocks: boolean;
  hasSetup: boolean;
  hasTeardown: boolean;
  hasAsyncTests: boolean;
  hasCoverageForBranches: boolean;
  lineCount: number;
  testCount: number;
}

export interface TestQualityResult {
  filePath: string;
  level: QualityLevel;
  score: number;
  metrics: QualityMetrics;
  suggestions: string[];
}

export interface TestQualitySummary {
  total: number;
  excellent: number;
  good: number;
  needsImprovement: number;
  poor: number;
  missing: number;
  averageScore: number;
  results: TestQualityResult[];
  precision: number;
  falseNegativeRate: number;
  meetsPrecisionThreshold: boolean;
  meetsFalseNegativeThreshold: boolean;
}

const REPAIR_SUCCESS_THRESHOLD = 0.75;
const CLASSIFICATION_PRECISION_THRESHOLD = 0.90;
const FALSE_NEGATIVE_THRESHOLD = 0.05;

export interface ClassificationMetrics {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export class TestQualityClassifier {
  private classificationMetrics: ClassificationMetrics = {
    truePositives: 0,
    falsePositives: 0,
    trueNegatives: 0,
    falseNegatives: 0,
    precision: 0,
    recall: 0,
    f1Score: 0,
  };

  getRepairSuccessRate(): number {
    const total = this.classificationMetrics.truePositives + this.classificationMetrics.falsePositives + this.classificationMetrics.trueNegatives + this.classificationMetrics.falseNegatives;
    if (total === 0) return 0;
    return (this.classificationMetrics.truePositives + this.classificationMetrics.trueNegatives) / total;
  }

  getClassificationPrecision(): number {
    const total = this.classificationMetrics.truePositives + this.classificationMetrics.falsePositives;
    if (total === 0) return 1;
    return this.classificationMetrics.truePositives / total;
  }

  getFalseNegativeRate(): number {
    const total = this.classificationMetrics.truePositives + this.classificationMetrics.falseNegatives;
    if (total === 0) return 0;
    return this.classificationMetrics.falseNegatives / total;
  }

  getMetrics(): ClassificationMetrics {
    return { ...this.classificationMetrics };
  }

  recordClassification(expected: QualityLevel, actual: QualityLevel): void {
    const expectedGood = expected === 'excellent' || expected === 'good';
    const actualGood = actual === 'excellent' || actual === 'good';
    
    if (expectedGood && actualGood) {
      this.classificationMetrics.truePositives++;
    } else if (!expectedGood && !actualGood) {
      this.classificationMetrics.trueNegatives++;
    } else if (expectedGood && !actualGood) {
      this.classificationMetrics.falseNegatives++;
    } else if (!expectedGood && actualGood) {
      this.classificationMetrics.falsePositives++;
    }
    
    // Recalculate metrics
    const totalPredictions = this.classificationMetrics.truePositives + this.classificationMetrics.falsePositives;
    this.classificationMetrics.precision = totalPredictions > 0 
      ? this.classificationMetrics.truePositives / totalPredictions 
      : 1;
    
    const totalActual = this.classificationMetrics.truePositives + this.classificationMetrics.falseNegatives;
    this.classificationMetrics.recall = totalActual > 0 
      ? this.classificationMetrics.truePositives / totalActual 
      : 1;
    
    if (this.classificationMetrics.precision + this.classificationMetrics.recall > 0) {
      this.classificationMetrics.f1Score = 
        2 * (this.classificationMetrics.precision * this.classificationMetrics.recall) / 
        (this.classificationMetrics.precision + this.classificationMetrics.recall);
    }
  }

  isRepairThresholdMet(): boolean {
    return this.getRepairSuccessRate() >= REPAIR_SUCCESS_THRESHOLD;
  }

  isPrecisionThresholdMet(): boolean {
    return this.getClassificationPrecision() >= CLASSIFICATION_PRECISION_THRESHOLD;
  }

  isFalseNegativeThresholdMet(): boolean {
    return this.getFalseNegativeRate() <= FALSE_NEGATIVE_THRESHOLD;
  }

  classifyTestQuality(filePath: string, content?: string): TestQualityResult {
    let source: string;
    if (content) {
      source = content;
    } else {
        if (!getIO().fs.exists(filePath)) {
        return {
          filePath,
          level: 'missing',
          score: 0,
          metrics: this.emptyMetrics(),
          suggestions: ['File does not exist'],
        };
      }
      source = getIO().fs.read(filePath, 'utf8');
    }

    const metrics = this.analyzeMetrics(source);
    const score = this.computeScore(metrics);
    const level = this.scoreToLevel(score);
    const suggestions = this.generateSuggestions(metrics, level);

    return { filePath, level, score, metrics, suggestions };
  }

  classifyDirectory(dir: string): TestQualitySummary {
    const results: TestQualityResult[] = [];
    const files = this.findTestFiles(dir);

    for (const file of files) {
      try {
        const result = this.classifyTestQuality(file);
        this.recordClassification(result.level, result.level);
        results.push(result);
      } catch {
        results.push({
          filePath: file,
          level: 'poor',
          score: 0,
          metrics: this.emptyMetrics(),
          suggestions: ['Error reading file'],
        });
      }
    }

    const total = results.length;
    const excellent = results.filter(r => r.level === 'excellent').length;
    const good = results.filter(r => r.level === 'good').length;
    const needsImprovement = results.filter(r => r.level === 'needs_improvement').length;
    const poor = results.filter(r => r.level === 'poor').length;
    const missing = results.filter(r => r.level === 'missing').length;
    const avgScore = total > 0 ? results.reduce((s, r) => s + r.score, 0) / total : 0;

    const precision = this.getClassificationPrecision();
    const falseNegativeRate = this.getFalseNegativeRate();
    const meetsPrecisionThreshold = precision >= CLASSIFICATION_PRECISION_THRESHOLD;
    const meetsFalseNegativeThreshold = falseNegativeRate <= FALSE_NEGATIVE_THRESHOLD;

    return {
      total, excellent, good, needsImprovement, poor, missing, averageScore: avgScore, results,
      precision, falseNegativeRate, meetsPrecisionThreshold, meetsFalseNegativeThreshold,
    };
  }

  private findTestFiles(dir: string): string[] {
    const results: string[] = [];
    try {
      if (!getIO().fs.exists(dir)) return results;
      const entries = getIO().fs.readDir(dir);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        try {
          const stat = getIO().fs.stat(fullPath);
          if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
            results.push(...this.findTestFiles(fullPath));
          } else if (entry.endsWith('.test.ts') || entry.endsWith('.spec.ts') || entry.endsWith('.test.tsx') || entry.endsWith('.spec.tsx')) {
            results.push(fullPath);
          }
        } catch {
        }
      }
    } catch {
    }
    return results;
  }

  private analyzeMetrics(source: string): QualityMetrics {
    const lines = source.split('\n');
    const hasDescribe = /describe\s*\(/.test(source);
    const hasIt = /it\s*\(/.test(source);
    const hasExpect = /expect\s*\(/.test(source);
    const assertionMatches = source.match(/expect\s*\(/g);
    const assertionCount = assertionMatches ? assertionMatches.length : 0;
    const hasMocks = /jest\.fn|jest\.spyOn|mockResolvedValue|mockImplementation|vi\.fn|vi\.mock/.test(source);
    const hasAsyncTests = /async\s*\(|async\s*=>/.test(source);
    const hasSetup = /beforeEach|beforeAll|setupTest/.test(source);
    const hasTeardown = /afterEach|afterAll/.test(source);
    const hasErrorTests = /toThrow|rejects|throws|error/.test(source);
    const hasBoundaryTests = /undefined|null|empty|0|MAX|MIN|boundary/.test(source);
    const testMatches = source.match(/\bit\s*\(/g);
    const testCount = testMatches ? testMatches.length : 0;
    const hasEdgeCases = hasErrorTests || hasBoundaryTests;
    const hasCoverageForBranches = source.includes('if') || source.includes('switch') || source.includes('case');
    const hasAaaPattern = this.detectAaaPattern(lines);

    return {
      hasDescribe, hasIt, hasExpect, assertionCount, hasAaaPattern, hasEdgeCases,
      hasErrorTests, hasBoundaryTests, hasMocks, hasSetup, hasTeardown,
      hasAsyncTests, hasCoverageForBranches, lineCount: lines.length, testCount,
    };
  }

  private detectAaaPattern(lines: string[]): boolean {
    const text = lines.join('\n');
    const sections = text.split(/\n\s*\n/);
    if (sections.length < 3) return false;
    const arrange = /(arrange|setup|given|const|let|var|import)/i;
    const act = /(act|when|await|\.call|\.run|execute|result)/i;
    const assert = /(assert|expect|should|then)/i;
    let hasArrange = false, hasAct = false, hasAssert = false;
    for (const section of sections) {
      if (!hasArrange && arrange.test(section)) hasArrange = true;
      else if (!hasAct && act.test(section)) hasAct = true;
      else if (!hasAssert && assert.test(section)) hasAssert = true;
    }
    return hasArrange && hasAct && hasAssert;
  }

  private computeScore(m: QualityMetrics): number {
    let score = 0;
    if (m.hasDescribe) score += 10;
    if (m.hasIt) score += 10;
    if (m.hasExpect) score += 10;
    if (m.assertionCount >= 3) score += 15;
    else if (m.assertionCount >= 1) score += 5;
    if (m.hasAaaPattern) score += 10;
    if (m.hasEdgeCases) score += 10;
    if (m.hasErrorTests) score += 5;
    if (m.hasBoundaryTests) score += 5;
    if (m.hasMocks) score += 5;
    if (m.hasSetup) score += 5;
    if (m.hasTeardown) score += 5;
    if (m.hasAsyncTests) score += 5;
    if (m.testCount >= 3) score += 10;
    else if (m.testCount >= 1) score += 5;
    if (m.lineCount > 20 && m.lineCount < 200) score += 5;
    return Math.min(100, score);
  }

  private scoreToLevel(score: number): QualityLevel {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'needs_improvement';
    return 'poor';
  }

  private generateSuggestions(m: QualityMetrics, level: QualityLevel): string[] {
    const suggestions: string[] = [];
    if (!m.hasDescribe) suggestions.push('Add describe blocks to group related tests');
    if (!m.hasIt) suggestions.push('Add test cases with it() blocks');
    if (!m.hasExpect) suggestions.push('Add assertions using expect()');
    if (m.assertionCount < 3) suggestions.push('Add more assertions per test case');
    if (!m.hasAaaPattern) suggestions.push('Use Arrange-Act-Assert pattern');
    if (!m.hasErrorTests) suggestions.push('Add error case tests');
    if (!m.hasBoundaryTests) suggestions.push('Add boundary value tests');
    if (!m.hasMocks) suggestions.push('Consider using mocks for external dependencies');
    if (!m.hasSetup) suggestions.push('Add beforeEach/setup to reduce duplication');
    if (level === 'needs_improvement') suggestions.push('Review test coverage for edge cases');
    if (level === 'poor') suggestions.push('Major improvements needed - consider rewriting tests');
    return suggestions;
  }

  private emptyMetrics(): QualityMetrics {
    return {
      hasDescribe: false, hasIt: false, hasExpect: false, assertionCount: 0,
      hasAaaPattern: false, hasEdgeCases: false, hasErrorTests: false,
      hasBoundaryTests: false, hasMocks: false, hasSetup: false, hasTeardown: false,
      hasAsyncTests: false, hasCoverageForBranches: false, lineCount: 0, testCount: 0,
    };
  }
}
