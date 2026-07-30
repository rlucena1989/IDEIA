import { Emitter, Event } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
import { Marker, MarkerCollection, MarkerFilter, MarkerManager, MarkerSeverity } from './types';

class DefaultMarkerCollection<T> implements MarkerCollection<T> {
  readonly owner: string;
  private markers = new Map<string, Marker<T>[]>();
  private onChangedEmitter = new Emitter<{ uri: string }>();

  get onMarkerChanged() { return this.onChangedEmitter.event; }

  constructor(owner: string) {
    this.owner = owner;
  }

  setMarkers(uri: string, markers: T[]): void {
    const mapped: Marker<T>[] = markers.map((data, i) => ({
      id: `${this.owner}:${uri}:${i}`,
      owner: this.owner,
      uri,
      data,
      severity: MarkerSeverity.Info,
      message: '',
      created: Date.now(),
    }));
    this.markers.set(uri, mapped);
    this.onChangedEmitter.fire({ uri });
  }

  getMarkers(uri?: string): Marker<T>[] {
    if (uri) return this.markers.get(uri) || [];
    const all: Marker<T>[] = [];
    for (const markers of this.markers.values()) {
      all.push(...markers);
    }
    return all;
  }

  findMarkers(filter: MarkerFilter<T>): Marker<T>[] {
    let results = this.getMarkers(filter.uri);
    if (filter.severity !== undefined) {
      results = results.filter(m => m.severity === filter.severity);
    }
    if (filter.message) {
      const msg = filter.message;
      results = results.filter(m => m.message.includes(msg));
    }
    if (filter.source) {
      results = results.filter(m => m.source === filter.source);
    }
    if (filter.predicate) {
      const predicate = filter.predicate;
      results = results.filter(m => predicate(m));
    }
    return results;
  }
}

export class DefaultMarkerManager implements MarkerManager {
  private collections = new Map<string, DefaultMarkerCollection<unknown>>();
  private onAddedEmitter = new Emitter<string>();
  private onRemovedEmitter = new Emitter<string>();

  get onCollectionAdded() { return this.onAddedEmitter.event; }
  get onCollectionRemoved() { return this.onRemovedEmitter.event; }

  getCollection<T>(owner: string): MarkerCollection<T> {
    let collection = this.collections.get(owner) as DefaultMarkerCollection<T> | undefined;
    if (!collection) {
      collection = new DefaultMarkerCollection<T>(owner);
      this.collections.set(owner, collection);
      this.onAddedEmitter.fire(owner);
    }
    return collection;
  }

  getMarkers<T>(filter?: MarkerFilter<T>): Marker<T>[] {
    const results: Marker<T>[] = [];
    for (const [, collection] of this.collections) {
      results.push(...(filter
        ? (collection as DefaultMarkerCollection<T>).findMarkers(filter)
        : (collection.getMarkers() as Marker<T>[])
      ));
    }
    return results;
  }

  removeCollection(owner: string): void {
    this.collections.delete(owner);
    this.onRemovedEmitter.fire(owner);
  }
}
