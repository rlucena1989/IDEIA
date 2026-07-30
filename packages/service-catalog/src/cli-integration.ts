export interface CLICommand {
  name: string;
  description: string;
  subcommands: string[];
  example: string;
}

export class IDPCLIIntegration {
  static getCommands(): CLICommand[] {
    return [
      { name: 'service', description: 'Manage services in the catalog', subcommands: ['list', 'create', 'scorecard', 'describe', 'deprecate'], example: 'IDEIA service list' },
      { name: 'template', description: 'Golden path templates', subcommands: ['list', 'use', 'create', 'publish'], example: 'IDEIA template use node-express' },
      { name: 'scorecard', description: 'Quality scorecards', subcommands: ['show', 'list', 'compare', 'history'], example: 'IDEIA scorecard show my-api' },
      { name: 'backstage', description: 'Backstage catalog sync', subcommands: ['export', 'import', 'validate', 'sync'], example: 'IDEIA backstage export --format yaml' },
    ];
  }

  static generateCommandRegistrations(): string {
    return JSON.stringify(this.getCommands().map(cmd => ({
      command: `ideia.${cmd.name}`,
      handler: `handle${cmd.name.charAt(0).toUpperCase() + cmd.name.slice(1)}Command`,
      subcommands: cmd.subcommands,
    })), null, 2);
  }

  static getExampleOutput(command: string, subcommand: string): string {
    const examples: Record<string, Record<string, string>> = {
      service: {
        list: 'Name    | Type | Owner  | Score  \n--------|------|--------|--------\nmy-api  | API  | team-a | 92/100 \nmy-core | lib  | team-b | 88/100 ',
        create: 'Service "my-api" created successfully. Generated at: ./services/my-api/',
      },
      backstage: {
        export: 'Backstage catalog exported to ./catalog-info.yaml. Entities: 12 components, 5 APIs, 3 resources, 2 systems',
        validate: 'Backstage catalog valid. 22 entities checked, 0 errors, 0 warnings.',
      },
    };
    return examples[command]?.[subcommand] ?? `IDEIA ${command} ${subcommand} --help`;
  }

  static generateSampleCatalogYaml(): string {
    return `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: my-api
  description: Sample API service
  tags:
    - api
    - typescript
  annotations:
    backstage.io/techdocs-ref: dir:.
    github.com/project-slug: ideia/my-api
spec:
  type: service
  lifecycle: production
  owner: team-ideia
  providesApis:
    - my-api-v1
  dependsOn:
    - component:my-core
---
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: my-api-v1
  description: REST API v1
spec:
  type: openapi
  lifecycle: production
  owner: team-ideia
  definition:
    $text: ./openapi.yaml`;
  }
}
