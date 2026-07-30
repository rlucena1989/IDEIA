export interface MaterializedView<T> {
  name: string;
  data: T;
  schema: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object'>;
  indexes: string[];
  lastUpdated: number;
  version: number;
}

export class MaterializedViewManager<T = Record<string, unknown>> {
  private _views = new Map<string, MaterializedView<T>>();

  create(name: string, initialData: T, schema: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object'>, indexes: string[] = []): MaterializedView<T> {
    const view: MaterializedView<T> = {
      name, data: initialData, schema, indexes,
      lastUpdated: Date.now(), version: 1,
    };
    this._views.set(name, view);
    return view;
  }

  update(name: string, updater: (data: T) => T): MaterializedView<T> | null {
    const view = this._views.get(name);
    if (!view) return null;
    view.data = updater(view.data);
    view.lastUpdated = Date.now();
    view.version++;
    return view;
  }

  get(name: string): MaterializedView<T> | null {
    return this._views.get(name) ?? null;
  }

  delete(name: string): boolean {
    return this._views.delete(name);
  }

  list(): MaterializedView<T>[] {
    return Array.from(this._views.values());
  }

  snapshot(name: string): T | null {
    return this._views.get(name)?.data ?? null;
  }
}
