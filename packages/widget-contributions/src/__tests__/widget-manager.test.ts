jest.mock('@ideia/core-contributions');

import { DefaultWidgetManager } from '../manager';
import { WidgetFactory } from '../types';

describe('DefaultWidgetManager', () => {
  let manager: DefaultWidgetManager;

  beforeEach(() => {
    manager = new DefaultWidgetManager();
  });

  it('should register a widget factory', () => {
    const factory: WidgetFactory = { id: 'widget1', createWidget: jest.fn() };
    const disposable = manager.registerFactory(factory);
    expect(disposable).toBeDefined();
    expect(typeof disposable.dispose).toBe('function');
  });

  it('should retrieve a registered factory', () => {
    const factory: WidgetFactory = { id: 'widget1', createWidget: jest.fn() };
    manager.registerFactory(factory);
    expect(manager.getFactory('widget1')).toBe(factory);
  });

  it('should return undefined for unregistered factory', () => {
    expect(manager.getFactory('unknown')).toBeUndefined();
  });

  it('should create a widget by id', () => {
    const widget = {};
    const factory: WidgetFactory = { id: 'widget1', createWidget: jest.fn().mockReturnValue(widget) };
    manager.registerFactory(factory);
    const created = manager.createWidget('widget1', { option: 'value' });
    expect(created).toBe(widget);
    expect(factory.createWidget).toHaveBeenCalledWith({ option: 'value' });
  });

  it('should throw when creating widget with unknown id', () => {
    expect(() => manager.createWidget('unknown')).toThrow('No widget factory registered for: unknown');
  });

  it('should throw when registering a duplicate factory', () => {
    const factory: WidgetFactory = { id: 'dup', createWidget: jest.fn() };
    manager.registerFactory(factory);
    expect(() => manager.registerFactory(factory)).toThrow('Widget factory already registered: dup');
  });

  it('should dispose factory registration', () => {
    const factory: WidgetFactory = { id: 'disposable', createWidget: jest.fn() };
    const disposable = manager.registerFactory(factory);
    expect(manager.getFactory('disposable')).toBe(factory);
    disposable.dispose();
    expect(manager.getFactory('disposable')).toBeUndefined();
  });

  it('should list all registered widget IDs', () => {
    manager.registerFactory({ id: 'a', createWidget: jest.fn() });
    manager.registerFactory({ id: 'b', createWidget: jest.fn() });
    expect(manager.getWidgets()).toEqual(['a', 'b']);
  });

  it('should return factory IDs after registration', () => {
    const factory: WidgetFactory = { id: 'event-test', createWidget: jest.fn() };
    manager.registerFactory(factory);
    expect(manager.getWidgets()).toContain('event-test');
  });

  it('should create widget without options', () => {
    const factory: WidgetFactory = { id: 'noopts', createWidget: jest.fn().mockReturnValue({}) };
    manager.registerFactory(factory);
    manager.createWidget('noopts');
    expect(factory.createWidget).toHaveBeenCalledWith(undefined);
  });
});
