import { describe, it, expect } from '@jest/globals';
import { PreservationVault } from '../preservation-vault';

describe('preservation-vault', () => {
  it('should store and list items', () => {
    const vault = new PreservationVault();
    vault.store('memory');
    vault.store('docs');
    expect(vault.count()).toBe(2);
    expect(vault.list()).toEqual(['memory', 'docs']);
  });

  it('should return empty list initially', () => {
    const vault = new PreservationVault();
    expect(vault.list()).toEqual([]);
    expect(vault.count()).toBe(0);
  });

  it('should clear all items', () => {
    const vault = new PreservationVault();
    vault.store('item1');
    vault.clear();
    expect(vault.count()).toBe(0);
  });
});
