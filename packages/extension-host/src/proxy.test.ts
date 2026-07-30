import { DefaultApiProxy } from './proxy';

describe('DefaultApiProxy', () => {
  let proxy: DefaultApiProxy;

  beforeEach(() => {
    proxy = new DefaultApiProxy();
  });

  it('should register and retrieve an API by namespace', () => {
    const api = { greet: () => 'hello' };
    proxy.registerApi('myExtension', api);

    const retrieved = proxy.getProxy<{ greet: () => string }>('myExtension');
    expect(retrieved.greet()).toBe('hello');
  });

  it('should throw when retrieving unregistered namespace', () => {
    expect(() => proxy.getProxy('nonexistent')).toThrow('API namespace not registered: nonexistent');
  });

  it('should return true from hasApi for registered namespace', () => {
    proxy.registerApi('ext', { x: 1 });
    expect(proxy.hasApi('ext')).toBe(true);
    expect(proxy.hasApi('other')).toBe(false);
  });

  it('should return the same instance after registration', () => {
    const api = { foo: 'bar' };
    proxy.registerApi('test', api);
    expect(proxy.getProxy('test')).toBe(api);
  });
});
