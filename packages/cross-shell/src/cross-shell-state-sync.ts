export interface SyncState {
  shellType: string;
  state: Record<string, unknown>;
  timestamp: number;
  version: number;
}

export interface StateChangeEvent {
  key: string;
  oldValue: unknown;
  newValue: unknown;
  source: string;
  timestamp: number;
}

export class CrossShellStateSync {
  private _states: Map<string, SyncState> = new Map();
  private _listeners: ((event: StateChangeEvent) => void)[] = [];
  private _channelName: string;

  constructor(channelName: string) {
    this._channelName = channelName;
  }

  publishState(key: string, value: unknown): void {
    const existing = this._states.get(key);
    const oldValue = existing ? existing.state[key] : undefined;
    const newVersion = existing ? existing.version + 1 : 1;
    const syncState: SyncState = {
      shellType: this._channelName,
      state: { [key]: value },
      timestamp: Date.now(),
      version: newVersion
    };
    this._states.set(key, syncState);
    const event: StateChangeEvent = {
      key,
      oldValue,
      newValue: value,
      source: this._channelName,
      timestamp: Date.now()
    };
    for (const listener of this._listeners) {
      listener(event);
    }
  }

  getState(key: string): unknown {
    const state = this._states.get(key);
    if (!state) {
      return undefined;
    }
    return state.state[key];
  }

  getAllStates(): Map<string, SyncState> {
    return new Map(this._states);
  }

  onStateChange(callback: (event: StateChangeEvent) => void): void {
    this._listeners.push(callback);
  }

  removeListener(callback: (event: StateChangeEvent) => void): void {
    const index = this._listeners.indexOf(callback);
    if (index >= 0) {
      this._listeners.splice(index, 1);
    }
  }

  clear(): void {
    this._states.clear();
  }

  getChannelName(): string {
    return this._channelName;
  }
}
