import { Command } from 'commander';
import { doctorCommand, checkEnv } from '../doctor';
import { MockIOContainer } from '../../io';

const OGTI = process.env.GTI_TEST_MODE;

beforeEach(() => { process.env.GTI_TEST_MODE = '1'; });
afterEach(() => { process.env.GTI_TEST_MODE = OGTI; });

describe('checkEnv', () => {
  it('returns score and report array', () => {
    const io = new MockIOContainer();
    io.setupProject();
    const result = checkEnv(io);
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('report');
    expect(Array.isArray(result.report)).toBe(true);
    expect(typeof result.score).toBe('number');
  });

  it('detects Node.js version', () => {
    const io = new MockIOContainer();
    io.setupProject();
    const result = checkEnv(io);
    expect(result.report.some(r => r.includes('Node.js'))).toBe(true);
  });

  it('returns lower score when manifest missing', () => {
    const io = new MockIOContainer();
    const result = checkEnv(io);
    expect(result.score).toBeLessThan(100);
  });

  it('returns full score when all checks pass', () => {
    const io = new MockIOContainer();
    io.setupProject();
    const result = checkEnv(io);
    expect(result.score).toBe(100);
  });
});

describe('doctorCommand', () => {
  it('returns a Commander Command with name doctor', () => {
    const cmd = doctorCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('doctor');
  });

  it('has description', () => {
    const cmd = doctorCommand();
    expect(cmd.description()).toBeTruthy();
  });
});
