import { GenerationScope } from './artifact-types';
import { createLogger } from '@ideia/logger';
import { DemandGenerationOutput, runDemandGeneration } from './generation-context';
import { DevkitState } from '../state/state-types';
import { buildDevkitState } from '../state/state-builder';
const logger = createLogger('generation-service');

export interface DemandServiceOptions {
  state?: DevkitState;
  outputDir?: string;
  verbose?: boolean;
}

export class DemandService {
  private state: DevkitState;
  private options: DemandServiceOptions;

  constructor(options: DemandServiceOptions = {}) {
    this.options = options;
    this.state = options.state ?? buildDevkitState();
  }

  generateFromScope(scope: GenerationScope): DemandGenerationOutput {
    return runDemandGeneration(scope, {
      state: this.state,
      templateVars: {
        version: this.state.version,
        lastUpdated: this.state.lastUpdated,
      },
    });
  }

  getState(): DevkitState {
    return this.state;
  }
}
