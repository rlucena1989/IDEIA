import { initCommand } from '../commands/init';
import { doctorCommand } from '../commands/doctor';
import { statusCommand } from '../commands/status';
import { hookCommand } from '../commands/hook';
import { modeCommand } from '../commands/mode';
import { detectCommand } from '../commands/detect';
import { compileCommand } from '../commands/compile';
import { scorecardCommand } from '../commands/scorecard';
import { knowledgeCommand } from '../commands/knowledge';
import { designCommand } from '../commands/design';
import { optimizeCommand } from '../commands/optimize';
import { engineerCommand } from '../commands/engineer';
import { getCliVersion } from '../utils/version';

describe('AI-Devkit Commands', () => {
  const commands = [
    { name: 'init', fn: initCommand },
    { name: 'doctor', fn: doctorCommand },
    { name: 'status', fn: statusCommand },
    { name: 'hook', fn: hookCommand },
    { name: 'mode', fn: modeCommand },
    { name: 'detect', fn: detectCommand },
    { name: 'compile', fn: compileCommand },
    { name: 'scorecard', fn: scorecardCommand },
    { name: 'knowledge', fn: knowledgeCommand },
    { name: 'design', fn: designCommand },
    { name: 'optimize', fn: optimizeCommand },
    { name: 'engineer', fn: engineerCommand },
  ];

  for (const cmd of commands) {
    it(`${cmd.name}Command deve retornar um Command object`, () => {
      const command = cmd.fn();
      expect(command).toBeDefined();
      expect(command.name()).toBe(cmd.name);
    });
  }

  it('getCliVersion deve retornar uma string', () => {
    const version = getCliVersion();
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });

  it('template directory deve existir', () => {
    const fs = require('fs');
    const path = require('path');
    const templateDir = path.join(__dirname, '../../templates');
    expect(fs.existsSync(templateDir)).toBe(true);
  });

  it('dist/index.js executavel deve existir', () => {
    const fs = require('fs');
    const path = require('path');
    const distPath = path.join(__dirname, '../../dist/index.js');
    expect(fs.existsSync(distPath)).toBe(true);
  });
});

describe('AI-Devkit Knowledge Base', () => {
  it('deve exportar 172+ entradas', () => {
    const kb = require('../local-ai/knowledge-base');
    const entries = kb.getCuratedEntries();
    expect(entries.length).toBeGreaterThanOrEqual(172);
  });

  it('deve ter categorias de arquitetura', () => {
    const kb = require('../local-ai/knowledge-base');
    const entries = kb.getCuratedEntries();
    const categories = new Set(entries.map((e: any) => e.category));
    expect(categories.has('architecture')).toBe(true);
    expect(categories.has('design')).toBe(true);
    expect(categories.has('devops')).toBe(true);
  });

  it('deve ter funcao de busca', () => {
    const kb = require('../local-ai/knowledge-base');
    const results = kb.searchEntries('clean architecture');
    expect(Array.isArray(results)).toBe(true);
  });

  it('deve ter funcao de getEntry', () => {
    const kb = require('../local-ai/knowledge-base');
    const entry = kb.getEntry('clean-architecture');
    expect(entry).toBeDefined();
    expect(entry!.id).toBe('clean-architecture');
  });
});
