import { MutationSurvivor, TestCase } from '../types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('targeted-generator');

export class TargetedTestGenerator {
  generateForSurvivor(survivor: MutationSurvivor): TestCase[] {
    const cases: TestCase[] = [];

    if (survivor.reason.includes('boundary') || survivor.originalCode.includes('>') || survivor.originalCode.includes('<')) {
      cases.push({
        name: `boundary_${survivor.mutantId}`,
        description: `Test boundary condition at ${survivor.location.file}:${survivor.location.line}`,
        type: 'boundary',
      });
    }

    if (survivor.originalCode.includes('if') || survivor.originalCode.includes('?')) {
      cases.push({
        name: `condition_${survivor.mutantId}`,
        description: `Test inverted condition at ${survivor.location.file}:${survivor.location.line}`,
        type: 'edge-case',
      });
    }

    if (survivor.originalCode.includes('+') || survivor.originalCode.includes('-')) {
      cases.push({
        name: `operator_${survivor.mutantId}`,
        description: `Test arithmetic operation at ${survivor.location.file}:${survivor.location.line}`,
        type: 'edge-case',
      });
    }

    if (survivor.originalCode.includes('null')) {
      cases.push({
        name: `null_${survivor.mutantId}`,
        description: `Test null handling at ${survivor.location.file}:${survivor.location.line}`,
        type: 'error-case',
      });
    }

    cases.push({
      name: `regression_${survivor.mutantId}`,
      description: `Regression test for surviving mutant ${survivor.mutantId}`,
      type: 'happy-path',
    });

    return cases;
  }
}
