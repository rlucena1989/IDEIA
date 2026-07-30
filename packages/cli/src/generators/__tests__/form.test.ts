jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { form } from '../form';

describe('form', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates React form by default', () => {
    form('Contact', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(1);
    expect(files[0].path).toContain('{{Name}}Form.tsx');
  });

  it('generates Vue form when stack is vue', () => {
    form('Signup', { dryRun: false, force: false, stack: 'vue' });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].path).toContain('{{Name}}Form.vue');
  });

  it('accepts custom fields', () => {
    form('Feedback', { dryRun: false, force: false, fields: 'rating,comment,category' });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('rating');
    expect(files[0].content).toContain('category');
  });

  it('uses default fields name,email,message when not provided', () => {
    form('Default', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('name');
    expect(files[0].content).toContain('email');
    expect(files[0].content).toContain('message');
  });

  it('interpolates entity name in component', () => {
    form('Newsletter', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('{{Name}} Form');
  });
});
