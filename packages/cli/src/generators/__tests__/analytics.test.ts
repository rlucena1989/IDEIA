jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { analyticsEvent } from '../analytics';

describe('analyticsEvent', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 1 YAML file entry', () => {
    analyticsEvent('purchase', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(1);
  });

  it('generates events YAML file', () => {
    analyticsEvent('signup', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].path).toContain('{{name_kebab}}-events.yaml');
    expect(files[0].content).toContain('Analytics Events: {{Name}}');
  });

  it('includes all 4 event types', () => {
    analyticsEvent('click', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('_viewed');
    expect(files[0].content).toContain('_interacted');
    expect(files[0].content).toContain('_completed');
    expect(files[0].content).toContain('_error');
  });

  it('interpolates feature name in event names', () => {
    analyticsEvent('tutorial', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('{{name_kebab}}_viewed');
    expect(files[0].content).toContain('{{name_kebab}}_completed');
  });
});
