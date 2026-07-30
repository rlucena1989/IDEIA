export {
  root, ex, read, hasContent, dirSize, jsonParse, runNode, git, gitExists,
  computeGit, gitTraceForFile, linkScoreToCommits, saveSnapshot,
  runAllScripts, jestResultOk
} from './scorecard-helpers';

export {
  cadenceMode, watchMode, serveMode
} from './scorecard-modes';

export {
  sendNotifications, publishResult, createTasksFromFailures, generateHTML
} from './scorecard-reporting';

export type { Notification } from './scorecard-notifications';

export interface Benchmarks {
  buildTimeMs: number | null;
  testTimeMs: number | null;
  lintTimeMs: number | null;
  totalFiles: number;
}

export {
  npmAudit, coveragePct, pylintOk, golintOk, oldestDep
} from '../utils/scorecard/audit';

export type { PolicyGate } from '../utils/scorecard/audit';
export { loadPolicyGates, applyPolicyGates } from '../utils/scorecard/audit';

export {
  calcScore, level, overallScore, shieldColor,
  buildRecommendations, buildAlerts, generateBadge,
  crossCategoryAnalysis, buildTrends
} from '../utils/scorecard/scoring';

export {
  runBenchmarks, buildAIAnalysisPrompt, queryLocalAI,
  forecastScore, detectRegression,
  validateYamlContent, generateFromTemplate,
  scoreDiffExport, loadCustomChecks
} from './scorecard-analysis';

