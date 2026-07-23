import _path from 'node:path';
import _fs from 'node:fs';

describe('Commands — attest.ts', () => {
  const a = require('../commands/attest');
  it('attestCommand retorna Command', () => { expect(a.attestCommand().name()).toBe('attest'); });
});

describe('Commands — engineer.ts', () => {
  const e = require('../commands/engineer');
  it('engineerCommand retorna Command', () => { expect(e.engineerCommand().name()).toBe('engineer'); });
});

describe('Commands — audit-ledger.ts', () => {
  const a = require('../commands/audit-ledger');
  it('auditLedgerCommand retorna Command', () => { expect(a.auditLedgerCommand().name()).toBe('audit-ledger'); });
});

describe('Contracts — validator.ts', () => {
  const v = require('../contracts/validator');
  it('validateSpec existe', () => { expect(typeof v.validateSpec).toBe('function'); });
});

describe('Contracts — differ.ts', () => {
  const d = require('../contracts/differ');
  it('diffSpecs existe', () => { expect(typeof d.diffSpecs).toBe('function'); });
});

describe('Contracts — linter.ts', () => {
  const l = require('../contracts/linter');
  it('lintSpec existe', () => { expect(typeof l.lintSpec).toBe('function'); });
});

describe('Contracts — generator.ts', () => {
  const g = require('../contracts/generator');
  it('generateClient existe', () => { expect(typeof g.generateClient).toBe('function'); });
  it('generateServer existe', () => { expect(typeof g.generateServer).toBe('function'); });
});

describe('Security — baseline.ts', () => {
  const b = require('../security/baseline');
  it('createBaseline existe', () => { expect(typeof b.createBaseline).toBe('function'); });
  it('detectDowngrades existe', () => { expect(typeof b.detectDowngrades).toBe('function'); });
});

describe('Security — barrier.ts', () => {
  const b = require('../utils/security/barrier');
  it('checkBarriers existe', () => { expect(typeof b.checkBarriers).toBe('function'); });
});

describe('Compliance — frameworks', () => {
  const f = require('../compliance/frameworks/index');
  it('FRAMEWORKS existe', () => { expect(Array.isArray(f.FRAMEWORKS)).toBe(true); });
});

describe('Compliance — mapper.ts', () => {
  const m = require('../compliance/mapper');
  it('mapRulesToFramework existe', () => { expect(typeof m.mapRulesToFramework).toBe('function'); });
});

describe('Plugins — manifest.ts', () => {
  const m = require('../plugins/manifest');
  it('validateManifest existe', () => { expect(typeof m.validateManifest).toBe('function'); });
});

describe('Plugins — loader.ts', () => {
  const l = require('../plugins/loader');
  it('loadPlugins existe', () => { expect(typeof l.loadPlugins).toBe('function'); });
  it('findPlugin existe', () => { expect(typeof l.findPlugin).toBe('function'); });
});

describe('Plugins — hooks.ts', () => {
  const h = require('../plugins/hooks');
  it('runPluginHook existe', () => { expect(typeof h.runPluginHook).toBe('function'); });
});

describe('Rules — registry.ts', () => {
  const r = require('../rules/registry');
  it('BUILT_IN_PACKS existe', () => { expect(Array.isArray(r.BUILT_IN_PACKS)).toBe(true); });
});

describe('Rules — pack.ts', () => {
  const p = require('../rules/pack');
  it('installPack existe', () => { expect(typeof p.installPack).toBe('function'); });
});

describe('Generators — engine.ts', () => {
  const e = require('../generators/engine');
  it('generateFiles existe', () => { expect(typeof e.generateFiles).toBe('function'); });
  it('buildVars gera variaveis', () => {
    const vars = e.buildVars('UserCard');
    expect(vars.name).toBe('UserCard');
    expect(vars.Name).toBe('UserCard');
    expect(vars.NAME).toBe('USERCARD');
  });
});

describe('Review — index.ts', () => {
  const r = require('../utils/review/index');
  it('antiSlop existe', () => { expect(typeof r.antiSlop).toBe('function'); });
  it('securityScan existe', () => { expect(typeof r.securityScan).toBe('function'); });
  it('performanceCheck existe', () => { expect(typeof r.performanceCheck).toBe('function'); });
  it('regressionCheck existe', () => { expect(typeof r.regressionCheck).toBe('function'); });
});

describe('Supply Chain — index.ts', () => {
  const s = require('../utils/supply-chain/index');
  it('scan existe', () => { expect(typeof s.scan).toBe('function'); });
  it('generateSbom existe', () => { expect(typeof s.generateSbom).toBe('function'); });
});

describe('Gate — stages.ts', () => {
  const s = require('../utils/gate/stages');
  it('getStages retorna array', () => { expect(Array.isArray(s.getStages())).toBe(true); });
  it('getStages filtra por nome', () => {
    expect(s.getStages('test')[0].name).toBe('test');
  });
});

describe('Gate — checkpoint.ts', () => {
  const c = require('../utils/gate/checkpoint');
  it('saveGateCheckpoint existe', () => { expect(typeof c.saveGateCheckpoint).toBe('function'); });
  it('listGateCheckpoints existe', () => { expect(typeof c.listGateCheckpoints).toBe('function'); });
});

describe('Health — required-files.ts', () => {
  const h = require('../core/health/required-files');
  it('REQUIRED_FILE_GROUPS array', () => { expect(Array.isArray(h.REQUIRED_FILE_GROUPS)).toBe(true); });
});

describe('Release — notes.ts', () => {
  const n = require('../release/notes');
  it('generateReleaseNotes existe', () => { expect(typeof n.generateReleaseNotes).toBe('function'); });
});

describe('Release — preparer.ts', () => {
  const p = require('../release/preparer');
  it('prepareRelease existe', () => { expect(typeof p.prepareRelease).toBe('function'); });
});
