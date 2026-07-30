jest.mock('../../io');

describe('Generators', () => {
  it('should load featureBlueprint', () => {
    const mod = require('../feature-blueprint');
    expect(mod.featureBlueprint).toBeDefined();
  });
});
