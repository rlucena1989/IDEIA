import { Disposable, Event } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';

export enum MarkerSeverity {
  Error = 8,
  Warning = 4,
  Info = 2,
  Hint = 1,
}

export interface Marker<T> {
  id: string;
  owner: string;
  uri: string;
  data: T;
  severity: MarkerSeverity;
  message: string;
  source?: string;
  created: number;
}

export interface MarkerCollection<T> {
  readonly owner: string;
  setMarkers(uri: string, markers: T[]): void;
  getMarkers(uri?: string): Marker<T>[];
  findMarkers(filter: MarkerFilter<T>): Marker<T>[];
  onMarkerChanged: Event<{ uri: string }>;
}

export interface MarkerFilter<T> {
  uri?: string;
  owner?: string;
  severity?: MarkerSeverity;
  message?: string;
  source?: string;
  predicate?: (marker: Marker<T>) => boolean;
}

export interface MarkerManager {
  getCollection<T>(owner: string): MarkerCollection<T>;
  getMarkers<T>(filter?: MarkerFilter<T>): Marker<T>[];
  removeCollection(owner: string): void;
  onCollectionAdded: Event<string>;
  onCollectionRemoved: Event<string>;
}

export interface Diagnostic {
  range: { startLine: number; startColumn: number; endLine: number; endColumn: number };
  severity: MarkerSeverity;
  message: string;
  source?: string;
  code?: string | number;
  relatedInformation?: DiagnosticRelatedInfo[];
}

export interface DiagnosticRelatedInfo {
  uri: string;
  range: { startLine: number; startColumn: number; endLine: number; endColumn: number };
  message: string;
}

export interface ProblemManager {
  setProblems(owner: string, uri: string, diagnostics: Diagnostic[]): void;
  getProblems(uri?: string): Diagnostic[];
  getProblemsByOwner(owner: string): Map<string, Diagnostic[]>;
  onProblemsChanged: Event<{ owner: string; uri: string }>;
}

export interface ProblemNode {
  file: string;
  severity: MarkerSeverity;
  message: string;
  line: number;
  column: number;
  owner: string;
  code?: string | number;
}

export interface OutputChannel {
  readonly id: string;
  readonly label: string;
  append(value: string): void;
  appendLine(value: string): void;
  replace(value: string): void;
  clear(): void;
  show(preserveFocus?: boolean): void;
  hide(): void;
  getContent(): string;
  getLines(): string[];
  dispose(): void;
}

export interface OutputChannelManager {
  createChannel(id: string, label: string): OutputChannel;
  getChannel(id: string): OutputChannel | undefined;
  deleteChannel(id: string): void;
  getChannels(): OutputChannel[];
  getActiveChannel(): OutputChannel | undefined;
  setActiveChannel(id: string): void;
}

export interface MessageService {
  info(message: string, actions?: MessageAction[]): Promise<string | undefined>;
  warn(message: string, actions?: MessageAction[]): Promise<string | undefined>;
  error(message: string, actions?: MessageAction[]): Promise<string | undefined>;
  showMessage(type: 'info' | 'warn' | 'error', message: string, actions?: MessageAction[]): Promise<string | undefined>;
}

export interface MessageAction {
  id: string;
  label: string;
  run: () => void;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warn' | 'error';
  timestamp: number;
  source?: string;
  actions?: MessageAction[];
  dismissed: boolean;
}

export interface NotificationManager {
  add(item: Omit<NotificationItem, 'id' | 'timestamp' | 'dismissed'>): string;
  dismiss(id: string): void;
  dismissAll(): void;
  getNotifications(): NotificationItem[];
  getUnreadCount(): number;
  onNotificationAdded: Event<NotificationItem>;
  onNotificationDismissed: Event<string>;
}
