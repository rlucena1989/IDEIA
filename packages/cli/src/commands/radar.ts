import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { TechnologyRadar, createTechnologyRadar } from '@ideia/technology-radar';
import { createBus, EventBus } from '@ideia/event-bus';
import { printHeader, printLine, printResult } from '../utils/output';

export function radarCommand(): Command {
  const cmd = new Command('radar')
    .description('Technology Radar: scan, evaluate, recommend technologies');

  let _radar: TechnologyRadar;
  async function getRadar(): Promise<TechnologyRadar> {
    if (!_radar) {
      const eventBus = await createBus() as unknown as EventBus;
      _radar = createTechnologyRadar(eventBus);
    }
    return _radar;
  }

  cmd
    .command('scan')
    .description('Scan for new technologies (GitHub, npm, arXiv)')
    .option('--source <source>', 'Specific source (github, npm, arxiv)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        printLine('Scanning technology landscape...');
        const radar = await getRadar();
        const results = await radar.scan();
        if (opts.json) { printLine(JSON.stringify(results, null, 2)); return; }
        printHeader('Technology Scan Results');
        for (const tech of results) {
          const source = tech.sources.github ? 'github' : tech.sources.npm ? 'npm' : 'arxiv';
          printLine(`  ${tech.name} (${source}): ${tech.description}`);
        }
        printLine(`\nTotal: ${results.length} technologies found`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Scan failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('recommend')
    .description('Get technology recommendations')
    .option('--min-score <number>', 'Minimum score (0-5)')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const radar = await getRadar();
        await radar.scan();
        const minScore = parseFloat(opts.minScore || '3.5');
        const recommendations = radar.getRecommendations(minScore);
        if (opts.json) { printLine(JSON.stringify(recommendations, null, 2)); return; }
        printHeader('Technology Recommendations');
        if (recommendations.length === 0) {
          printLine('  No recommendations meet the minimum score threshold.');
          return;
        }
        for (const rec of recommendations) {
          printLine(`  ${rec.technology.name}`);
          printLine(`    Score: ${rec.score}/5`);
          printLine(`    Description: ${rec.technology.description}`);
          printLine('');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Recommend failed: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('trending')
    .description('Show trending technologies')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      try {
        const radar = await getRadar();
        const trending = radar.getTrending();
        if (opts.json) { printLine(JSON.stringify(trending, null, 2)); return; }
        printHeader('Trending Technologies');
        for (const t of trending) {
          printLine(`  ${t.name} - ${t.description}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Trending failed: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
