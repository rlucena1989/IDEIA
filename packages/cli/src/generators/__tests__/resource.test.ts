jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { resource } from '../resource';

describe('resource', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates React resource by default (3 files)', () => {
    resource('User', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(3);
    expect(files[0].path).toContain('{{Name}}.tsx');
  });

  it('generates Vue resource when stack is vue (2 files)', () => {
    resource('Profile', { dryRun: false, force: false, stack: 'vue' });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
    expect(files[0].path).toContain('{{Name}}.vue');
  });

  it('generates Angular resource when stack is angular (3 files)', () => {
    resource('Home', { dryRun: false, force: false, stack: 'angular' });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(3);
    expect(files[0].path).toContain('{{name_kebab}}.component.ts');
  });

  it('generates CSS module for React', () => {
    resource('Panel', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[1].path).toContain('module.css');
  });

  it('generates test file for React', () => {
    resource('Widget', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[2].path).toContain('{{Name}}.test.tsx');
  });

  it('interpolates entity name in Vue template', () => {
    resource('About', { dryRun: false, force: false, stack: 'vue' });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('{{Name}}');
  });
});
