import { computeScorecard } from '../packages/cli/src/commands/scorecard';
import fs from 'node:fs';
import path from 'node:path';

const result = computeScorecard();
const reportDir = path.join(process.cwd(), '.ai', 'reports', 'scorecard');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'latest.json'), JSON.stringify(result, null, 2));

const output = {
  overallScore: result.overallScore,
  maturityLevel: result.maturityLevel,
  categories: result.categories.map(c => ({
    name: c.name,
    weight: c.weight,
    score: Math.round(c.score),
    passed: c.items.filter(i => i.passed).length,
    total: c.items.length,
    failures: c.items.filter(i => !i.passed).map(i => ({ id: i.id, desc: i.description, value: i.value }))
  }))
};
console.log(JSON.stringify(output));
