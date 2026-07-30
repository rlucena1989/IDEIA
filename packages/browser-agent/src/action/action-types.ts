export interface NavigateAction {
  type: 'navigate';
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
}

export interface ClickAction {
  type: 'click';
  selector: string;
  timeout?: number;
  force?: boolean;
}

export interface TypeAction {
  type: 'type';
  selector: string;
  text: string;
  delay?: number;
}

export interface ScrollAction {
  type: 'scroll';
  selector?: string;
  x?: number;
  y?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  amount?: number;
}

export interface WaitAction {
  type: 'wait';
  selector?: string;
  timeout?: number;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
  duration?: number;
}

export interface ExtractAction {
  type: 'extract';
  selector: string;
  property?: 'text' | 'html' | 'attribute' | 'value';
  attribute?: string;
}

export interface AssertAction {
  type: 'assert';
  assertion: 'url' | 'title' | 'text' | 'visible' | 'exists';
  expected?: string;
  selector?: string;
  timeout?: number;
}

export type Action = NavigateAction | ClickAction | TypeAction | ScrollAction | WaitAction | ExtractAction | AssertAction;

export interface ActionResult {
  success: boolean;
  action: Action;
  duration: number;
  error?: string;
  screenshot?: string;
  data?: unknown;
  metrics?: {
    startTime: number;
    endTime: number;
    retries: number;
  };
}

export interface ActionContext {
  sessionId: string;
  url: string;
  title: string;
  timestamp: number;
}
