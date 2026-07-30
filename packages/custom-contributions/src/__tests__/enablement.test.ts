jest.mock('@ideia/core-contributions');

import { DefaultEnablementService } from '../enablement';
import { EnablementRule } from '../types';

describe('DefaultEnablementService', () => {
  let service: DefaultEnablementService;

  beforeEach(() => {
    service = new DefaultEnablementService();
  });

  it('should enable a target when no rules apply', () => {
    expect(service.isEnabled('any.target', {})).toBe(true);
  });

  it('should register a rule and return a disposable', () => {
    const rule: EnablementRule = { id: 'rule1', condition: 'isAdmin', targetIds: ['admin.panel'], enabled: true };
    const disposable = service.registerRule(rule);
    expect(disposable).toBeDefined();
    expect(typeof disposable.dispose).toBe('function');
  });

  it('should enable a target when context matches an enabled rule', () => {
    const rule: EnablementRule = { id: 'rule1', condition: 'isAdmin', targetIds: ['admin.panel'], enabled: true };
    service.registerRule(rule);
    expect(service.isEnabled('admin.panel', { isAdmin: true })).toBe(true);
  });

  it('should disable a target when context matches a disabled rule', () => {
    const rule: EnablementRule = { id: 'rule1', condition: 'isAdmin', targetIds: ['admin.panel'], enabled: false };
    service.registerRule(rule);
    expect(service.isEnabled('admin.panel', { isAdmin: true })).toBe(false);
  });

  it('should enable a target when context does not match any rule', () => {
    const rule: EnablementRule = { id: 'rule1', condition: 'featureFlag', targetIds: ['beta.feature'], enabled: false };
    service.registerRule(rule);
    expect(service.isEnabled('beta.feature', {})).toBe(true);
  });

  it('should handle multiple rules for different targets', () => {
    const rule1: EnablementRule = { id: 'r1', condition: 'isAdmin', targetIds: ['admin.panel'], enabled: true };
    const rule2: EnablementRule = { id: 'r2', condition: 'isAdmin', targetIds: ['delete.btn'], enabled: false };
    service.registerRule(rule1);
    service.registerRule(rule2);
    expect(service.isEnabled('admin.panel', { isAdmin: true })).toBe(true);
    expect(service.isEnabled('delete.btn', { isAdmin: true })).toBe(false);
  });

  it('should return all registered rules', () => {
    const rule: EnablementRule = { id: 'r1', condition: 'x', targetIds: ['a'], enabled: true };
    service.registerRule(rule);
    const rules = service.getRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('r1');
  });

  it('should return a copy of rules array', () => {
    const rule: EnablementRule = { id: 'r1', condition: 'x', targetIds: ['a'], enabled: true };
    service.registerRule(rule);
    const rules = service.getRules();
    rules.push({ id: 'fake', condition: '', targetIds: [], enabled: false });
    expect(service.getRules()).toHaveLength(1);
  });

  it('should remove rule when disposable is disposed', () => {
    const rule: EnablementRule = { id: 'r1', condition: 'flag', targetIds: ['feature'], enabled: false };
    const disposable = service.registerRule(rule);
    expect(service.isEnabled('feature', { flag: true })).toBe(false);
    disposable.dispose();
    expect(service.isEnabled('feature', { flag: true })).toBe(true);
  });

  it('should evaluate the first matching rule', () => {
    const rule1: EnablementRule = { id: 'r1', condition: 'flag', targetIds: ['feature'], enabled: false };
    const rule2: EnablementRule = { id: 'r2', condition: 'flag', targetIds: ['feature'], enabled: true };
    service.registerRule(rule1);
    service.registerRule(rule2);
    expect(service.isEnabled('feature', { flag: true })).toBe(false);
  });
});
