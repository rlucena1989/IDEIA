import { getCliVersion } from '../utils/version';
import _path from 'node:path';

describe('Utils — version.ts', () => {
  it('getCliVersion deve retornar versão', () => {
    const v = getCliVersion();
    expect(v).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('Utils — output.ts', () => {
  const out = require('../utils/output');
  it('printHeader existe', () => { expect(typeof out.printHeader).toBe('function'); });
  it('printLine existe', () => { expect(typeof out.printLine).toBe('function'); });
  it('printResult existe', () => { expect(typeof out.printResult).toBe('function'); });
  it('finish existe', () => { expect(typeof out.finish).toBe('function'); });
});

describe('Utils — copy.ts', () => {
  const copy = require('../utils/copy');
  it('copyTemplateDirectory existe', () => {
    expect(typeof copy.copyTemplateDirectory).toBe('function');
  });
});

describe('Utils — prerequisites.ts', () => {
  const prereqs = require('../utils/prerequisites');
  it('checkPrerequisites existe', () => {
    expect(typeof prereqs.checkPrerequisites).toBe('function');
  });
});

describe('Utils — report.ts', () => {
  const report = require('../utils/report');
  it('generateSetupReport existe', () => {
    expect(typeof report.generateSetupReport).toBe('function');
  });
});

describe('Utils — template.ts', () => {
  const tmpl = require('../utils/template');
  it('deve exportar funções', () => {
    expect(typeof tmpl.findTemplateAiDir).toBe('function');
  });
});

describe('Commands — mode.ts', () => {
  const mode = require('../commands/mode');
  it('getMode retorna config', () => {
    const result = mode.getMode(process.cwd());
    expect(typeof result.mode).toBe('string');
  });
  it('modeCommand retorna Command', () => {
    expect(mode.modeCommand().name()).toBe('mode');
  });
});

describe('Commands — doctor.ts', () => {
  const doctor = require('../commands/doctor');
  it('doctorCommand retorna Command', () => {
    expect(doctor.doctorCommand().name()).toBe('doctor');
  });
});

describe('Commands — status.ts', () => {
  const status = require('../commands/status');
  it('statusCommand retorna Command', () => {
    expect(status.statusCommand().name()).toBe('status');
  });
});

describe('Commands — wizard.ts', () => {
  const wizard = require('../commands/wizard');
  it('wizardCommand retorna Command', () => {
    expect(wizard.wizardCommand().name()).toBe('wizard');
  });
});

describe('Commands — hook.ts', () => {
  const hook = require('../commands/hook');
  it('hookCommand retorna Command', () => {
    expect(hook.hookCommand().name()).toBe('hook');
  });
});

describe('Commands — detect.ts', () => {
  const detect = require('../commands/detect');
  it('detectStack retorna array', () => {
    if (typeof detect.detectStack === 'function') {
      const result = detect.detectStack(process.cwd());
      expect(result.languages.length).toBeGreaterThanOrEqual(0);
      expect(typeof result.packageManager).toBe('string');
    }
  });
});

describe('Commands — scorecard.ts', () => {
  const sc = require('../commands/scorecard');
  it('scorecardCommand retorna Command', () => {
    expect(sc.scorecardCommand().name()).toBe('scorecard');
  });
});

describe('Commands — compile.ts', () => {
  const compile = require('../commands/compile');
  it('compileCommand retorna Command', () => {
    expect(compile.compileCommand().name()).toBe('compile');
  });
});

describe('Commands — agents.ts', () => {
  const agents = require('../commands/agents');
  it('agentsCommand retorna Command', () => {
    expect(agents.agentsCommand().name()).toBe('agents');
  });
  it('listAgents retorna array', () => {
    expect(Array.isArray(agents.listAgents(process.cwd()))).toBe(true);
  });
});
