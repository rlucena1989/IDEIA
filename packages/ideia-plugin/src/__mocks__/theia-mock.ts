export const JsonRpcServer = class {};
export const RpcProxy = class {};
export const Disposable = { create: () => ({ dispose: () => {} }) };
export const Emitter = class {
  fire() {}
  dispose() {}
  get event() { return () => () => {}; }
};
export const MessageClient = class {};
export const ApplicationServer = class {};
export const Widget = class {};
export const BaseWidget = class {};
export const StatefulWidget = class {};
export const MessageService = class { info() {} warn() {} error() {} progress() { return { result: Promise.resolve() }; } };
export const OpenerService = class { getOpener() { return Promise.resolve({ open: () => Promise.resolve() }); } };
export const CommandRegistry = class { registerCommand() { return { dispose: () => {} }; } registerHandler() { return { dispose: () => {} }; } };
export const MenuModelRegistry = class { registerMenuAction() { return { dispose: () => {} }; } };
export const KeybindingRegistry = class { registerKeybinding() { return { dispose: () => {} }; } };
export class MarkerManager {
  private markers = new Map<string, unknown[]>();
  setMarkers(uri: { toString(): string }, owner: string, markers: unknown[]): void {
    this.markers.set(uri.toString(), markers);
  }
  getMarkers(uri: { toString(): string }): unknown[] {
    return this.markers.get(uri.toString()) || [];
  }
}
export class Marker<D> {
  constructor(public data: D, public uri: string, public owner: string) {}
}
