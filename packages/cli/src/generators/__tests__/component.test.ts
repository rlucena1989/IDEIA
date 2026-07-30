jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { component } from '../component';

describe('component', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates React component files by default', () => {
    component('MyButton', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(3);
    expect(files[0].path).toContain('{{Name}}.tsx');
  });

  it('generates Vue component files when stack is vue', () => {
    component('MyCard', { dryRun: false, force: false, stack: 'vue' });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
    expect(files[0].path).toContain('{{Name}}.vue');
  });

  it('generates Storybook stories for React', () => {
    component('Modal', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.map((f: { path: string }) => f.path).some((p: string) => p.includes('.stories.'))).toBe(true);
  });

  it('includes type option in output', () => {
    component('DataTable', { dryRun: false, force: false, type: 'table' });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('data-component=\"table\"');
  });

  it('uses card as default type', () => {
    component('DefaultCard', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('data-component=\"card\"');
  });
});
