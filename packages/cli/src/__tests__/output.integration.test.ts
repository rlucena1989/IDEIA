import { printHeader, printLine, printResult, printSummary, finish } from '../utils/output';

let mockLog: jest.Mock;

beforeEach(() => {
  mockLog = jest.fn();
  jest.spyOn(console, 'log').mockImplementation(mockLog);
  delete process.env.AI_LLM_MODE;
});
afterEach(() => { jest.restoreAllMocks(); });

describe('printHeader', () => {
  it('prints title', () => { printHeader('Title'); expect(mockLog).toHaveBeenCalled(); });
  it('skips in LLM mode', () => { process.env.AI_LLM_MODE = '1'; printHeader('x'); expect(mockLog).not.toHaveBeenCalled(); });
});

describe('printLine', () => {
  it('prints line', () => { printLine('hi'); expect(mockLog).toHaveBeenCalledWith('hi'); });
  it('skips in LLM mode', () => { process.env.AI_LLM_MODE = '1'; printLine('x'); expect(mockLog).not.toHaveBeenCalled(); });
});

describe('printResult', () => {
  it('prints success', () => { printResult('test', true); expect(mockLog).toHaveBeenCalled(); });
  it('prints failure', () => { printResult('test', false); expect(mockLog).toHaveBeenCalled(); });
});

describe('printSummary', () => {
  it('prints for high score', () => { printSummary(90, 100, 'q'); expect(mockLog).toHaveBeenCalled(); });
  it('prints for medium score', () => { printSummary(70, 100, 'q'); expect(mockLog).toHaveBeenCalled(); });
  it('prints for low score', () => { printSummary(50, 100, 'q'); expect(mockLog).toHaveBeenCalled(); });
});

describe('finish', () => {
  it('exits 0 for ok', () => {
    jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit0'); });
    expect(() => finish({ checkpoint: 'c', ok: true, status: 'p', context_summary: 's' })).toThrow('exit0');
  });
  it('exits 1 for not ok', () => {
    jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit1'); });
    expect(() => finish({ checkpoint: 'c', ok: false, status: 'f', context_summary: 's' })).toThrow('exit1');
  });
  it('outputs JSON in LLM mode', () => {
    process.env.AI_LLM_MODE = '1';
    jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    expect(() => finish({ checkpoint: 'x', ok: true, status: 'p', context_summary: 's' })).toThrow('exit');
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining('"checkpoint": "x"'));
  });
});
