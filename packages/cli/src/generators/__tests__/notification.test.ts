jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { notification } from '../notification';

describe('notification', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 2 file entries', () => {
    notification('email', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
  });

  it('generates notification class file', () => {
    notification('sms', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].path).toContain('{{Name}}Notification.ts');
    expect(files[0].content).toContain('class {{Name}}Notification');
  });

  it('generates index barrel file', () => {
    notification('push', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[1].path).toContain('index.ts');
    expect(files[1].content).toContain('{{Name}}Notification');
  });

  it('uses PascalCase for class name', () => {
    notification('in-app', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('{{Name}}Notification');
  });
});
