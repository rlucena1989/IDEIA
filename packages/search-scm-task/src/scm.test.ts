import { DefaultScmService, GitScmProvider } from './scm';
import { ScmProvider } from './types';

describe('DefaultScmService', () => {
  let service: DefaultScmService;

  beforeEach(() => {
    service = new DefaultScmService();
  });

  it('registers a provider and fires onProviderRegistered', () => {
    const provider = createMockProvider('git', 'Git');
    const eventSpy = jest.fn();
    service.onProviderRegistered(eventSpy);

    service.registerProvider('git', provider);

    expect(service.getProvider('git')).toBe(provider);
    expect(eventSpy).toHaveBeenCalledWith('git');
  });

  it('unregisters a provider and fires onProviderUnregistered', () => {
    const provider = createMockProvider('git', 'Git');
    service.registerProvider('git', provider);
    const eventSpy = jest.fn();
    service.onProviderUnregistered(eventSpy);

    service.unregisterProvider('git');

    expect(service.getProvider('git')).toBeUndefined();
    expect(eventSpy).toHaveBeenCalledWith('git');
  });

  it('returns all registered providers via getProviders', () => {
    const p1 = createMockProvider('git', 'Git');
    const p2 = createMockProvider('hg', 'Mercurial');
    service.registerProvider('git', p1);
    service.registerProvider('hg', p2);

    const all = service.getProviders();

    expect(all).toHaveLength(2);
    expect(all).toContain(p1);
    expect(all).toContain(p2);
  });

  it('returns undefined for unregistered provider id', () => {
    expect(service.getProvider('nonexistent')).toBeUndefined();
  });

  it('unregisterProvider does not throw when id does not exist', () => {
    expect(() => service.unregisterProvider('ghost')).not.toThrow();
  });
});

describe('GitScmProvider', () => {
  let provider: GitScmProvider;

  beforeEach(() => {
    provider = new GitScmProvider();
  });

  it('has default id and label', () => {
    expect(provider.id).toBe('git');
    expect(provider.label).toBe('Git');
  });

  it('accepts custom id and label', () => {
    const custom = new GitScmProvider('custom-git', 'Custom Git');
    expect(custom.id).toBe('custom-git');
    expect(custom.label).toBe('Custom Git');
  });

  it('returns a default status with no changes', async () => {
    const status = await provider.getStatus();
    expect(status).toEqual({ changes: [], hasChanges: false });
  });

  it('returns an input box with default placeholder', () => {
    const inputBox = provider.getInputBox();
    expect(inputBox.placeholder).toBe('Commit message...');
    expect(inputBox.value).toBe('');
  });

  it('input box fires onValueChanged when value is set', () => {
    const inputBox = provider.getInputBox();
    const spy = jest.fn();
    inputBox.onValueChanged(spy);

    inputBox.value = 'fix: bug';

    expect(spy).toHaveBeenCalledWith('fix: bug');
  });
});

function createMockProvider(id: string, label: string): ScmProvider {
  return {
    id,
    label,
    getStatus: jest.fn().mockResolvedValue({ changes: [], hasChanges: false }),
    getInputBox: jest.fn().mockReturnValue({ value: '', placeholder: '', onValueChanged: jest.fn() }),
    getActions: jest.fn().mockReturnValue([]),
  };
}
