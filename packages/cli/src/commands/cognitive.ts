import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { printHeader, printLine} from '../utils/output';
import { CognitiveCoprocessor } from '../cognitive-coprocessor/integration';
import { PatternIntegration } from '../cognitive-coprocessor/pattern-integration';
import { LlmEnrichment } from '../cognitive-coprocessor/llm-enrichment';
import { success, CliCommandResult } from '../types/cli-result';
let coprocessorInstance: CognitiveCoprocessor | null = null;
let patternIntegrationInstance: PatternIntegration | null = null;
let llmEnrichmentInstance: LlmEnrichment | null = null;
const logger = createLogger('cognitive');

function getCoprocessor(): CognitiveCoprocessor {
  if (!coprocessorInstance) {
    coprocessorInstance = new CognitiveCoprocessor();
  }
  return coprocessorInstance;
}

function getPatternIntegration(): PatternIntegration {
  if (!patternIntegrationInstance) {
    patternIntegrationInstance = new PatternIntegration();
  }
  return patternIntegrationInstance;
}

function getLlmEnrichment(): LlmEnrichment {
  if (!llmEnrichmentInstance) {
    llmEnrichmentInstance = new LlmEnrichment();
  }
  return llmEnrichmentInstance;
}

export function cognitiveCommand(): Command {
  const cmd = new Command('cognitive')
    .description('Cognitive Coprocessor — pattern detection, learning, and LLM enrichment');

  cmd.command('analyze <input>')
    .description('Analyze input through the cognitive coprocessor with pattern context')
    .option('--json', 'Output as JSON')
    .option('--record', 'Record input for pattern detection')
    .action(async (input: string, opts: Record<string, unknown>): Promise<CliCommandResult> => {
      printHeader('Cognitive Coprocessor — Analysis');

      const coprocessor = getCoprocessor();
      const patternIntegration = getPatternIntegration();
      const record = (opts as Record<string, string>).record === 'true' || Boolean((opts as Record<string, boolean>).record);

      if (record) {
        patternIntegration.recordInteraction(input);
      }

      const result = await coprocessor.process({
        title: 'Cognitive analysis',
        description: input,
      });

      const enriched = await patternIntegration.enrichContext(
        { normalizedInput: null, metrics: null, inconsistencies: null, priorities: null, simulations: null, hints: null, validationRules: [] },
        input,
      );

      const output = {
        intent: result.intent,
        plan: result.plan,
        validated: result.validated,
        validationErrors: result.validationErrors,
        patterns: enriched.patterns.map(p => ({ name: p.name, frequency: p.frequency, confidence: p.confidence })),
        recommendations: enriched.recommendations.map(r => ({ category: r.category, title: r.title, confidence: r.confidence })),
        suggestions: enriched.suggestions,
      };

      const isJson = Boolean((opts as Record<string, boolean>).json);
      if (isJson) {
        printLine(JSON.stringify(output, null, 2));
      } else {
        printLine(`Intent: ${output.intent.primary}`);
        printLine(`Validated: ${output.validated}`);
        if (output.validationErrors.length > 0) {
          printLine(`Errors: ${output.validationErrors.join(', ')}`);
        }
        printLine(`Patterns found: ${output.patterns.length}`);
        printLine(`Recommendations: ${output.recommendations.length}`);
        if (output.suggestions.length > 0) {
          printLine('Suggestions:');
          for (const s of output.suggestions) {
            printLine(`  - ${s}`);
          }
        }
      }

      return success('Cognitive analysis completed', output);
    });

  cmd.command('status')
    .description('Show pattern detector and learning engine status')
    .option('--json', 'Output as JSON')
    .action((opts: Record<string, unknown>): CliCommandResult => {
      printHeader('Cognitive Coprocessor — Status');

      const patternIntegration = getPatternIntegration();
      const llmEnrichment = getLlmEnrichment();

      const patterns = patternIntegration.getDetector().getPatterns();
      const trends = patternIntegration.getDetector().getTrends();
      const history = patternIntegration.getDetector().getPatternHistory(3);
      const providerName = llmEnrichment.getProvider().name;
      const routerProviders = llmEnrichment.getRouter().listProviders();

      const statusOutput = {
        patternDetector: {
          totalPatterns: patterns.length,
          recentTrends: trends.length,
          historyMonths: history.length,
        },
        learningEngine: {
          provider: providerName,
          providerRouter: routerProviders,
          patternsLoaded: patterns.length,
        },
        topPatterns: patterns.slice(0, 5).map(p => ({
          name: p.name,
          frequency: p.frequency,
          confidence: p.confidence,
          source: p.source,
        })),
      };

      const isJson = Boolean((opts as Record<string, boolean>).json);
      if (isJson) {
        printLine(JSON.stringify(statusOutput, null, 2));
      } else {
        printLine(`Pattern Detector: ${statusOutput.patternDetector.totalPatterns} total patterns`);
        printLine(`Recent Trends: ${statusOutput.patternDetector.recentTrends}`);
        printLine(`History (3 months): ${statusOutput.patternDetector.historyMonths} entries`);
        printLine(`LLM Provider: ${statusOutput.learningEngine.provider}`);
        printLine(`Provider Router: ${statusOutput.learningEngine.providerRouter.join(', ') || 'none'}`);
        if (statusOutput.topPatterns.length > 0) {
          printLine('Top Patterns:');
          for (const p of statusOutput.topPatterns) {
            printLine(`  - ${p.name} (freq: ${p.frequency}, conf: ${(p.confidence * 100).toFixed(0)}%, src: ${p.source ?? 'N/A'})`);
          }
        }
      }

      return success('Cognitive status retrieved', statusOutput);
    });

  return cmd;
}
