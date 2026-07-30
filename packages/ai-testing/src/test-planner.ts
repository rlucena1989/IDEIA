import { createLogger } from '@ideia/logger';
import {  AnalysisContext, TestPlan, TestCase, TestType, ClassificationResult, ClassificationFeedback, ClassificationMetrics, TestPlannerConfig,
} from './types';
const logger = createLogger('test-planner');

export class TestPlanner {
  private classificationHistory: ClassificationFeedback[] = [];
  private config: TestPlannerConfig = {
    enableConfidenceTracking: true,
    accuracyThreshold: 90,
    feedbackCollection: true,
  };

  plan(context: AnalysisContext): TestPlan {
    const classification = this.classifyTestType(context);
    const testCases = this.generateTestCases(context, classification.testType);
    return {
      filePath: context.sourceFile.replace(/\.ts$/, '.test.ts'),
      testType: classification.testType,
      testCases,
      estimatedEffort: testCases.length * 5,
      priority: this.calculatePriority(context),
    };
  }

  classifyTestType(context: AnalysisContext): ClassificationResult {
    const features: string[] = [];

    const hasIO = context.dependencies.some(d =>
      ['fs', 'http', 'net', 'ws', 'child_process'].some(x => d.includes(x))
    );
    if (hasIO) features.push('io-bound');

    const allFunctions = context.exports.every(e => e.type === 'function');
    const isPureLogic = allFunctions && !hasIO;
    if (isPureLogic) features.push('pure-logic');

    const isTSX = context.sourceFile.endsWith('.tsx') || context.sourceFile.endsWith('.jsx');
    if (isTSX) features.push('tsx-extension');

    const hasReactImport = /from\s+['"]react['"]/i.test(context.sourceCode);
    if (hasReactImport) features.push('react-import');

    const hasJSXPattern = /<[A-Z][a-zA-Z]*/.test(context.sourceCode);
    if (hasJSXPattern) features.push('jsx-pattern');

    const isAPI = context.sourceCode.includes('app.get') || context.sourceCode.includes('router.');
    if (isAPI) features.push('api-route');

    let testType: TestType;
    let confidence: number;
    let details: string;

    if (isAPI) {
      testType = TestType.E2E;
      confidence = 0.9;
      details = 'API routes detected';
    } else if (isTSX || hasReactImport || hasJSXPattern) {
      const matchCount = [isTSX, hasReactImport, hasJSXPattern].filter(Boolean).length;
      testType = context.dependencies.length > 3 ? TestType.Integration : TestType.Unit;
      confidence = matchCount === 3 ? 0.9 : matchCount === 2 ? 0.7 : 0.5;
      details = `Component detected (${matchCount}/3 signals)`;
    } else if (isPureLogic) {
      testType = TestType.Unit;
      confidence = 0.8;
      details = 'Pure logic function detected';
    } else {
      testType = hasIO ? TestType.Integration : TestType.Unit;
      confidence = hasIO ? 0.6 : 0.5;
      details = hasIO ? 'IO-bound dependencies' : 'Default classification';
    }

    if (this.config.feedbackCollection) {
      this.classificationHistory.push({
        actualType: testType,
        predictedType: testType,
        features: [...features],
        correct: true,
        confidence,
      });
    }

    return { testType, confidence, features, details };
  }

  generateTestCases(context: AnalysisContext, testType: TestType): TestCase[] {
    const cases: TestCase[] = [];

    for (const exp of context.exports) {
      if (exp.type === 'function') {
        cases.push({
          name: `${exp.name}_happy_path`,
          description: `Test ${exp.name} with valid input`,
          type: 'happy-path',
        });
        cases.push({
          name: `${exp.name}_edge_case`,
          description: `Test ${exp.name} with edge case input`,
          type: 'edge-case',
        });
        cases.push({
          name: `${exp.name}_error_case`,
          description: `Test ${exp.name} error handling`,
          type: 'error-case',
        });
      }
      if (exp.type === 'class') {
        cases.push({
          name: `${exp.name}_instantiation`,
          description: `Test ${exp.name} instantiation`,
          type: 'happy-path',
        });
        cases.push({
          name: `${exp.name}_methods`,
          description: `Test ${exp.name} public methods`,
          type: 'happy-path',
        });
      }
    }

    if (testType === TestType.Integration) {
      cases.push({
        name: 'integration_flow',
        description: 'Test integration between components',
        type: 'happy-path',
      });
    }

    return cases;
  }

  private calculatePriority(context: AnalysisContext): number {
    let priority = 5;
    if (context.coverageData && context.coverageData.lines < 50) priority += 3;
    if (context.existingTests.length === 0) priority += 2;
    if (context.exports.some(e => e.type === 'class')) priority += 1;
    return Math.min(priority, 10);
  }

  recordClassificationFeedback(feedback: ClassificationFeedback): void {
    this.classificationHistory.push(feedback);
  }

  getAccuracy(): number {
    if (this.classificationHistory.length === 0) return 0;
    const correct = this.classificationHistory.filter(f => f.correct).length;
    return (correct / this.classificationHistory.length) * 100;
  }

  getMetrics(): ClassificationMetrics {
    const totalClassified = this.classificationHistory.length;
    const correctClassifications = this.classificationHistory.filter(f => f.correct).length;
    const lastN = this.classificationHistory.slice(-10);
    const lastNCorrect = lastN.filter(f => f.correct).length;
    const accuracy = totalClassified > 0 ? (correctClassifications / totalClassified) * 100 : 0;
    return {
      accuracy,
      totalClassified,
      correctClassifications,
      lastNCorrect,
      meetsThreshold: accuracy >= (this.config.accuracyThreshold ?? 90),
    };
  }

  getConfidence(): number {
    const withConfidence = this.classificationHistory.filter(f => f.confidence !== undefined);
    if (withConfidence.length === 0) return 0;
    const total = withConfidence.reduce((s, f) => s + (f.confidence as number), 0);
    return total / withConfidence.length;
  }

  setConfig(config: Partial<TestPlannerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
