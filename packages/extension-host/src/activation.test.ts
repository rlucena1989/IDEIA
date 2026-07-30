import { DefaultExtensionActivationService } from './activation';
import { ActivationEvent, ActivationEventHandler } from './types';

describe('DefaultExtensionActivationService', () => {
  let service: DefaultExtensionActivationService;

  beforeEach(() => {
    service = new DefaultExtensionActivationService();
  });

  it('should fire activation event to matching handlers', () => {
    const handler: ActivationEventHandler = {
      canHandle: jest.fn().mockReturnValue(true),
      handle: jest.fn().mockResolvedValue(undefined),
    };
    service.registerHandler(handler);

    const event: ActivationEvent = { type: 'onCommand', extensionId: 'ext-1', timestamp: Date.now() };
    service.fireActivationEvent(event);

    expect(handler.canHandle).toHaveBeenCalledWith(event);
    expect(handler.handle).toHaveBeenCalledWith(event);
  });

  it('should skip handlers that cannot handle the event', () => {
    const handler: ActivationEventHandler = {
      canHandle: jest.fn().mockReturnValue(false),
      handle: jest.fn(),
    };
    service.registerHandler(handler);

    service.fireActivationEvent({ type: 'onLanguage', extensionId: 'ext-2', timestamp: 1 });
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it('should track activated extensions', () => {
    const handler: ActivationEventHandler = {
      canHandle: () => true,
      handle: jest.fn().mockResolvedValue(undefined),
    };
    service.registerHandler(handler);

    expect(service.isActivated('ext-3')).toBe(false);
    service.fireActivationEvent({ type: 'onStartup', extensionId: 'ext-3', timestamp: 1 });
    expect(service.isActivated('ext-3')).toBe(true);
  });

  it('should fire onExtensionActivated event', () => {
    const activatedSpy = jest.fn();
    service.onExtensionActivated(activatedSpy);

    const handler: ActivationEventHandler = {
      canHandle: () => true,
      handle: jest.fn().mockResolvedValue(undefined),
    };
    service.registerHandler(handler);
    service.fireActivationEvent({ type: 'onView', extensionId: 'ext-4', timestamp: 1 });

    expect(activatedSpy).toHaveBeenCalledWith('ext-4');
  });

  it('should deactivate extension and fire onExtensionDeactivated', () => {
    const deactivatedSpy = jest.fn();
    service.onExtensionDeactivated(deactivatedSpy);
    service.deactivate('ext-5');

    expect(deactivatedSpy).toHaveBeenCalledWith('ext-5');
    expect(service.isActivated('ext-5')).toBe(false);
  });
});
