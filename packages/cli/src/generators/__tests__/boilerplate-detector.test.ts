import { describe, it, expect } from '@jest/globals';
import { boilerplateRemove } from '../boilerplate-detector';

describe('boilerplate-detector', () => {
  it('boilerplateRemove should be defined', () => {
    expect(boilerplateRemove).toBeDefined();
  });
});
