jest.mock('@ideia/core-contributions', () => {
  class Emitter<T> {
    private listeners: Array<(event: T) => void> = [];
    get event() {
      return (listener: (event: T) => void) => {
        this.listeners.push(listener);
        return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
      };
    }
    fire(event: T): void { this.listeners.forEach(l => l(event)); }
    dispose(): void { this.listeners = []; }
  }
  return { Emitter };
});

import { DefaultMarkerManager } from './marker-manager';

describe('DefaultMarkerManager', () => {
  let manager: DefaultMarkerManager;

  beforeEach(() => {
    manager = new DefaultMarkerManager();
  });

  it('should create and cache a collection per owner', () => {
    const col1 = manager.getCollection('owner1');
    const col2 = manager.getCollection('owner1');
    expect(col1).toBe(col2);
    expect(col1.owner).toBe('owner1');
  });

  it('should fire onCollectionAdded when a new collection is created', () => {
    const added = jest.fn();
    manager.onCollectionAdded(added);
    manager.getCollection('new-owner');
    expect(added).toHaveBeenCalledWith('new-owner');
  });

  it('should return markers from all collections via getMarkers', () => {
    const col = manager.getCollection<{ x: number }>('owner');
    col.setMarkers('file-a.ts', [{ x: 1 }, { x: 2 }]);
    col.setMarkers('file-b.ts', [{ x: 3 }]);

    const all = manager.getMarkers();
    expect(all).toHaveLength(3);
  });

  it('should filter markers using predicate', () => {
    const col1 = manager.getCollection<{ x: number }>('own1');
    const col2 = manager.getCollection<{ x: number }>('own2');
    col1.setMarkers('f1.ts', [{ x: 1 }]);
    col2.setMarkers('f2.ts', [{ x: 2 }]);

    const result = manager.getMarkers({ predicate: m => m.owner === 'own1' });
    expect(result).toHaveLength(1);
    expect(result[0].owner).toBe('own1');
  });

  it('should remove a collection and fire onCollectionRemoved', () => {
    const removed = jest.fn();
    manager.onCollectionRemoved(removed);
    manager.getCollection('to-remove');
    manager.removeCollection('to-remove');
    expect(removed).toHaveBeenCalledWith('to-remove');
    expect(manager.getMarkers()).toHaveLength(0);
  });
});
