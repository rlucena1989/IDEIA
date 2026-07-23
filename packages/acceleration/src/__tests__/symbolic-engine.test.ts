import { describe, it, expect } from '@jest/globals';
import { parseExpression, simplify, differentiate, exprToString } from '../symbolic-engine';

describe('symbolic-engine', () => {
  it('parseExpression should be defined', () => {
    expect(parseExpression).toBeDefined();
  });
  it('parseExpression should be a function', () => {
    expect(typeof parseExpression).toBe('function');
  });
  it('simplify should be defined', () => {
    expect(simplify).toBeDefined();
  });
  it('simplify should be a function', () => {
    expect(typeof simplify).toBe('function');
  });
  it('differentiate should be defined', () => {
    expect(differentiate).toBeDefined();
  });
  it('differentiate should be a function', () => {
    expect(typeof differentiate).toBe('function');
  });
  it('exprToString should be defined', () => {
    expect(exprToString).toBeDefined();
  });
  it('exprToString should be a function', () => {
    expect(typeof exprToString).toBe('function');
  });
});
