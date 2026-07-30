export { complianceCommand } from './commands';
export type { CliCommandResult } from './types';
export { success, failure } from './types';

export const helpText = `
Compliance CLI — enterprise compliance management

Commands:
  compliance check [options]     Run compliance check against configured standards
  compliance report [options]    Generate a compliance report
  compliance evidence [options]  List evidence items
  compliance score [options]     Show compliance score

Options:
  -s, --standard <standard>  Filter by standard (SOC2, LGPD, HIPAA, GDPR)
  --json                     Output in JSON format
  --help                     Display help
`;
