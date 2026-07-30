import type { InitResult, CommandResult, QualityGateResult, AdapterConfig } from './types';
import { createLogger } from '@ideia/logger';
import { execCommand } from './utils';
const logger = createLogger('adapter-base');

export abstract class AdapterBase {
  abstract readonly name: string;
  abstract readonly language: string;
  abstract readonly capabilities: string[];

  protected config: AdapterConfig;

  constructor(config: AdapterConfig = {}) {
    this.config = config;
  }

  abstract detect(projectRoot: string): boolean;

  abstract init(projectName: string, options?: Record<string, unknown>): Promise<InitResult>;

  abstract generateTemplate(type: string): Promise<string>;

  abstract runLint(projectRoot?: string): Promise<CommandResult>;

  abstract runTests(projectRoot?: string): Promise<CommandResult>;

  abstract runBuild(projectRoot?: string): Promise<CommandResult>;

  abstract qualityGate(projectRoot?: string): Promise<QualityGateResult>;

  protected exec(command: string, cwd?: string, timeout?: number): Promise<CommandResult> {
    return execCommand(command, cwd || this.config.projectRoot || process.cwd(), timeout);
  }
}
