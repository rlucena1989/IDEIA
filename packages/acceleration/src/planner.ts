import { EngineMode, Forecast, PrecisionReport, PlannedJob } from './types';
import { createLogger } from '@ideia/logger';
export { PlannedJob };
const logger = createLogger('planner');

function getRealJobs(mode: EngineMode): PlannedJob[] {
  const jobs: PlannedJob[] = [];

  const baseJobs = [
    {
      name: 'Audit Env',
      command: 'npx tsx scripts/audit/check-env.ts',
      priority: 10,
      tags: ['diagnostic', 'env', 'bootstrap']
    },
    {
      name: 'Test Basic',
      command: 'npx jest --passWithNoTests --silent --testPathPattern=smoke 2>&1',
      priority: 8,
      tags: ['diagnostic', 'smoke', 'tests']
    },
    {
      name: 'Lint Check',
      command: 'npx eslint packages/cli/src --quiet 2>&1',
      priority: 7,
      tags: ['diagnostic', 'lint', 'code-quality']
    },
    {
      name: 'Import Check',
      command: 'npx tsx scripts/audit/check-imports.ts',
      priority: 6,
      tags: ['diagnostic', 'imports']
    }
  ];

  // Add more jobs for deeper modes
  const extraJobs: Record<string, { name: string; command: string; priority: number; tags: string[] }[]> = {
    balanced: [
      {
        name: 'Run Tests',
        command: 'npx jest --passWithNoTests --silent --testPathPattern=smoke --maxWorkers=2 2>&1',
        priority: 5,
        tags: ['diagnostic', 'tests']
      }
    ],
    deep: [
      {
        name: 'Run Tests',
        command: 'npx jest --passWithNoTests --silent --testPathPattern=smoke --maxWorkers=2 2>&1',
        priority: 5,
        tags: ['diagnostic', 'tests']
      },
      {
        name: 'Duplicate Check',
        command: 'npx tsx scripts/audit/check-duplicates.ts',
        priority: 4,
        tags: ['diagnostic', 'code-quality']
      },
      {
        name: 'Flow Check',
        command: 'npx tsx scripts/audit/check-flows.ts',
        priority: 3,
        tags: ['diagnostic', 'integration']
      }
    ]
  };

  // Select jobs based on mode
  let selected = [...baseJobs];
  if (mode !== 'fast') {
    const extras = extraJobs[mode] ?? extraJobs.balanced;
    selected = [...selected, ...extras];
  }

  // Apply limit based on mode
  const maxJobs = mode === 'fast' ? 3 : mode === 'balanced' ? 6 : 10;
  selected = selected.slice(0, maxJobs);

  // Build planned jobs
  for (let i = 0; i < selected.length; i++) {
    const src = selected[i];
    jobs.push({
      id: `job-${i + 1}`,
      name: `${mode}-${src.name.toLowerCase().replace(/\s+/g, '-')}`,
      command: src.command,
      priority: src.priority,
      dependsOn: [],
      tags: src.tags
    });
  }

  return jobs;
}

export function createPlan(mode: EngineMode, forecast: Forecast, precision: PrecisionReport): PlannedJob[] {
  const jobs = getRealJobs(mode);
  const stable = precision.stable;

  // Guarded mode: dependent jobs wait for first job
  if (!stable && jobs.length > 1) {
    for (let i = 1; i < jobs.length; i++) {
      jobs[i].dependsOn.push(jobs[0].id);
      if (!jobs[i].tags.includes('guarded')) {
        jobs[i].tags.push('guarded');
      }
    }
  }

  // Tag risk levels
  for (const job of jobs) {
    const riskTag = forecast.risk === 'high' ? 'high-risk' : forecast.risk === 'medium' ? 'medium-risk' : 'low-risk';
    if (!job.tags.includes(riskTag)) job.tags.push(riskTag);
  }

  // Tag first and last
  if (jobs.length > 0) {
    if (!jobs[0].tags.includes('bootstrap')) jobs[0].tags.push('bootstrap');
    if (!jobs[jobs.length - 1].tags.includes('finalize')) jobs[jobs.length - 1].tags.push('finalize');
  }

  return jobs;
}
