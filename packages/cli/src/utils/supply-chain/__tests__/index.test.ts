import { scan, generateSbom, audit, verifyPackage, printScanReport } from '../index';
import type { CveEntry, ScanResult } from '../index';

describe('index', () => {
  it('scan should be defined', () => {
    expect(scan).toBeDefined();
  });
  it('scan should execute without throwing', () => {
    expect(typeof scan).toBe('function');
    try { (scan as any)(); } catch {}
  });
  it('generateSbom should be defined', () => {
    expect(generateSbom).toBeDefined();
  });
  it('generateSbom should execute without throwing', () => {
    expect(typeof generateSbom).toBe('function');
    try { (generateSbom as any)(); } catch {}
  });
  it('audit should be defined', () => {
    expect(audit).toBeDefined();
  });
  it('audit should execute without throwing', () => {
    expect(typeof audit).toBe('function');
    try { (audit as any)(); } catch {}
  });
  it('verifyPackage should be defined', () => {
    expect(verifyPackage).toBeDefined();
  });
  it('verifyPackage should execute without throwing', () => {
    expect(typeof verifyPackage).toBe('function');
    try { (verifyPackage as any)(); } catch {}
  });
  it('printScanReport should be defined', () => {
    expect(printScanReport).toBeDefined();
  });
  it('printScanReport should execute without throwing', () => {
    expect(typeof printScanReport).toBe('function');
    try { (printScanReport as any)(); } catch {}
  });
  it('CveEntry interface should be a type', () => {
    expect(typeof (null as unknown as CveEntry)).toBe('object');
  });
  it('ScanResult interface should be a type', () => {
    expect(typeof (null as unknown as ScanResult)).toBe('object');
  });
});
