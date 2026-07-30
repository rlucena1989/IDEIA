jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { dto } from '../dto';

describe('dto', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 4 file entries', () => {
    dto('User', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(4);
  });

  it('generates CreateDTO file', () => {
    dto('Product', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].path).toContain('Create{{Name}}DTO.ts');
    expect(files[0].content).toContain('Create{{Name}}Schema');
  });

  it('generates UpdateDTO file', () => {
    dto('Order', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[1].path).toContain('Update{{Name}}DTO.ts');
    expect(files[1].content).toContain('Update{{Name}}Schema');
  });

  it('generates ResponseDTO file', () => {
    dto('Invoice', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[2].path).toContain('{{Name}}ResponseDTO.ts');
    expect(files[2].content).toContain('{{Name}}ResponseDTO');
  });

  it('generates test file for DTOs', () => {
    dto('Customer', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[3].path).toContain('DTO.test.ts');
    expect(files[3].content).toContain('describe(');
  });

  it('interpolates entity name in content', () => {
    dto('TestEntity', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].content).toContain('Create{{Name}}');
    expect(files[1].content).toContain('Update{{Name}}');
  });
});
