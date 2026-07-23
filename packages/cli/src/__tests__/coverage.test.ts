import { getCliVersion } from '../utils/version';
import * as output from '../utils/output';
import { generateSetupReport } from '../utils/report';
import { checkPrerequisites } from '../utils/prerequisites';
import { upsertPackageScripts } from '../utils/package-json';
import { detectStack } from '../commands/detect';
import { getMode, modeCommand } from '../commands/mode';
import { hookCommand } from '../commands/hook';
import { doctorCommand } from '../commands/doctor';
import { statusCommand } from '../commands/status';
import { wizardCommand } from '../commands/wizard';
import { getCuratedEntries, searchEntries, getEntry, exportEntries } from '../local-ai/knowledge-base';
import { tfidfClassify } from '../local-ai/classifier';
import { designCommand } from '../commands/design';
import { optimizeCommand } from '../commands/optimize';
import { engineerCommand } from '../commands/engineer';
import { compileCommand } from '../commands/compile';
import { agentsCommand, listAgents } from '../commands/agents';
import { knowledgeCommand } from '../commands/knowledge';
import { antiSlop, securityScan } from '../utils/review/index';
import { scan } from '../utils/supply-chain/index';
import fs from 'node:fs';
import path from 'node:path';

describe('Utils — version.ts', () => {
  it('getCliVersion deve retornar string não vazia', () => {
    const v = getCliVersion();
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThan(0);
  });
});

describe('Utils — output.ts', () => {
  it('printHeader deve existir e ser função', () => {
    expect(typeof output.printHeader).toBe('function');
  });

  it('printLine deve existir e ser função', () => {
    expect(typeof output.printLine).toBe('function');
  });

  it('printResult deve existir e ser função', () => {
    expect(typeof output.printResult).toBe('function');
  });

  it('finish deve existir e ser função', () => {
    expect(typeof output.finish).toBe('function');
  });
});

describe('Utils — report.ts', () => {
  it('deve exportar generateSetupReport', () => {
    expect(typeof generateSetupReport).toBe('function');
  });
});

describe('Utils — prerequisites.ts', () => {
  it('deve exportar checkPrerequisites', () => {
    expect(typeof checkPrerequisites).toBe('function');
  });
});

describe('Utils — package-json.ts', () => {
  it('deve exportar upsertPackageScripts', () => {
    expect(typeof upsertPackageScripts).toBe('function');
  });
});

describe('Commands — detect.ts', () => {
  it('detectStack deve exportar e aceitar root', () => {
    if (typeof detectStack === 'function') {
      const result = detectStack(process.cwd());
      expect(result).toBeDefined();
    }
  });
});

describe('Commands — mode.ts', () => {
  it('deve exportar getMode e modeCommand', () => {
    expect(typeof getMode).toBe('function');
    expect(typeof modeCommand).toBe('function');
  });

  it('getMode deve retornar config', () => {
    const current = getMode(process.cwd());
    expect(current).toBeDefined();
    expect(typeof current.mode).toBe('string');
  });
});

describe('Commands — hook.ts', () => {
  it('deve exportar hookCommand function', () => {
    expect(typeof hookCommand).toBe('function');
  });
});

describe('Commands — doctor.ts', () => {
  it('deve exportar doctorCommand function', () => {
    expect(typeof doctorCommand).toBe('function');
  });
});

describe('Commands — status.ts', () => {
  it('deve exportar statusCommand function', () => {
    expect(typeof statusCommand).toBe('function');
  });
});

describe('Commands — wizard.ts', () => {
  it('deve exportar wizardCommand function', () => {
    expect(typeof wizardCommand).toBe('function');
  });
});

describe('Local AI — knowledge-base.ts', () => {
  it('getCuratedEntries deve retornar 172+ entries', () => {
    const entries = getCuratedEntries();
    expect(entries.length).toBeGreaterThanOrEqual(172);
  });

  it('searchEntries deve filtrar por query', () => {
    const results = searchEntries('clean architecture');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toContain('clean');
  });

  it('getEntry deve retornar entry por id', () => {
    const entry = getEntry('clean-architecture');
    expect(entry).toBeDefined();
    expect(entry!.category).toBe('architecture');
    expect(entry!.tags.length).toBeGreaterThan(0);
  });

  it('getEntry deve retornar undefined para id inexistente', () => {
    const entry = getEntry('non-existent-id');
    expect(entry).toBeUndefined();
  });

  it('exportEntries deve criar diretorio', () => {
    const testDir = path.join(__dirname, '../../.ai-test-temp');
    exportEntries(testDir);
    const entriesDir = path.join(testDir, '.ai/knowledge/entries');
    expect(fs.existsSync(entriesDir)).toBe(true);
    const files = fs.readdirSync(entriesDir);
    expect(files.length).toBeGreaterThan(0);
    try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
  });
});

describe('Local AI — classifier.ts', () => {
  it('deve exportar tfidfClassify', () => {
    expect(typeof tfidfClassify).toBe('function');
  });

  it('tfidfClassify deve classificar texto', () => {
    const result = tfidfClassify('Preciso criar uma nova funcionalidade de login');
    expect(result).toBeDefined();
    expect(typeof result.category).toBe('string');
  });
});

describe('Commands — design.ts', () => {
  it('deve exportar designCommand function', () => {
    expect(typeof designCommand).toBe('function');
  });
});

describe('Commands — optimize.ts', () => {
  it('deve exportar optimizeCommand function', () => {
    expect(typeof optimizeCommand).toBe('function');
  });
});

describe('Commands — engineer.ts', () => {
  it('deve exportar engineerCommand function', () => {
    expect(typeof engineerCommand).toBe('function');
  });
});

describe('Commands — compile.ts', () => {
  it('deve exportar compileCommand function', () => {
    expect(typeof compileCommand).toBe('function');
  });
});

describe('Commands — agents.ts', () => {
  it('deve exportar agents functions', () => {
    expect(typeof agentsCommand).toBe('function');
    expect(typeof listAgents).toBe('function');
    const result = typeof listAgents === 'function' ? listAgents() : [];
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('Commands — knowledge.ts', () => {
  it('deve exportar knowledgeCommand function', () => {
    expect(typeof knowledgeCommand).toBe('function');
  });
});

describe('Utils — review/index.ts', () => {
  it('deve exportar funcoes de review', () => {
    expect(typeof antiSlop).toBe('function');
    expect(typeof securityScan).toBe('function');
  });
});

describe('Utils — supply-chain/index.ts', () => {
  it('deve exportar scan', () => {
    expect(typeof scan).toBe('function');
  });
});
