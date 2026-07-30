import { IDPCLIIntegration } from '../src/cli-integration';
import { GoldenPathTemplates } from '../src/golden-path-templates';

describe('IDPCLIIntegration', () => {
  it('getCommands returns 4 commands', () => {
    const commands = IDPCLIIntegration.getCommands();
    expect(commands).toHaveLength(4);
  });

  it('getCommands service has 5 subcommands', () => {
    const commands = IDPCLIIntegration.getCommands();
    const service = commands.find(c => c.name === 'service');
    expect(service).toBeDefined();
    expect(service!.subcommands).toHaveLength(5);
  });

  it('generateCommandRegistrations valid JSON', () => {
    const json = IDPCLIIntegration.generateCommandRegistrations();
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(4);
    expect(parsed[0].command).toBe('ideia.service');
    expect(parsed[0].handler).toBe('handleServiceCommand');
  });

  it('getExampleOutput returns non-empty string', () => {
    const output = IDPCLIIntegration.getExampleOutput('service', 'list');
    expect(output.length).toBeGreaterThan(0);
    expect(typeof output).toBe('string');
  });

  it('getExampleOutput for unknown command returns help fallback', () => {
    const output = IDPCLIIntegration.getExampleOutput('unknown', 'cmd');
    expect(output).toBe('IDEIA unknown cmd --help');
  });

  it('generateSampleCatalogYaml valid YAML structure', () => {
    const yaml = IDPCLIIntegration.generateSampleCatalogYaml();
    expect(yaml).toContain('apiVersion: backstage.io/v1alpha1');
    expect(yaml).toContain('kind: Component');
    expect(yaml).toContain('kind: API');
    expect(yaml).toContain('my-api');
  });
});

describe('GoldenPathTemplates', () => {
  it('getNodeExpressTemplate has 5 files', () => {
    const tmpl = GoldenPathTemplates.getNodeExpressTemplate();
    expect(tmpl.files).toHaveLength(5);
    expect(tmpl.id).toBe('node-express');
    expect(tmpl.prerequisites).toContain('Node.js 20+');
  });

  it('getPythonFastAPITemplate has 4 files', () => {
    const tmpl = GoldenPathTemplates.getPythonFastAPITemplate();
    expect(tmpl.files).toHaveLength(4);
    expect(tmpl.id).toBe('python-fastapi');
    expect(tmpl.estimatedTime).toBe('3 minutes');
  });

  it('getTypeScriptLibTemplate has 3 files', () => {
    const tmpl = GoldenPathTemplates.getTypeScriptLibTemplate();
    expect(tmpl.files).toHaveLength(3);
    expect(tmpl.id).toBe('ts-lib');
    expect(tmpl.tags).toContain('typescript');
  });

  it('getTemplate returns correct template', () => {
    const tmpl = GoldenPathTemplates.getTemplate('node-express');
    expect(tmpl).toBeDefined();
    expect(tmpl!.name).toBe('Node.js Express API');
    expect(tmpl!.files[0].path).toBe('src/index.ts');
  });

  it('getTemplate for unknown id returns undefined', () => {
    const tmpl = GoldenPathTemplates.getTemplate('nonexistent');
    expect(tmpl).toBeUndefined();
  });

  it('listTemplates returns 3 templates', () => {
    const list = GoldenPathTemplates.listTemplates();
    expect(list).toHaveLength(3);
    expect(list[0].id).toBe('node-express');
    expect(list[1].id).toBe('python-fastapi');
    expect(list[2].id).toBe('ts-lib');
  });
});
