jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { layout } from '../layout';

describe('layout', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates React layout by default (2 files)', () => {
    layout('Main', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
    expect(files[0].path).toContain('{{Name}}Layout.tsx');
  });

  it('generates Vue layout when stack is vue (1 file)', () => {
    layout('Admin', { dryRun: false, force: false, stack: 'vue' });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(1);
    expect(files[0].path).toContain('{{Name}}Layout.vue');
  });

  it('generates CSS file for React layout', () => {
    layout('Dashboard', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[1].path).toContain('{{Name}}Layout.css');
  });

  it('uses default pattern sidebar-content', () => {
    layout('DefaultLayout', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('sidebar');
  });

  it('interpolates name in CSS classes', () => {
    layout('App', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('{{name_kebab}}-layout');
    expect(files[1].content).toContain('app-layout');
  });
});
