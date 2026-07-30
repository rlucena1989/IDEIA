// ==========================================================================
// types.ts — Tipos do Computer Use Engine
// ==========================================================================

export type BrowserActionType =
  | 'navigate' | 'click' | 'fill' | 'select' | 'hover'
  | 'scroll' | 'extract' | 'screenshot' | 'evaluate'
  | 'wait' | 'keyboard' | 'upload' | 'download' | 'close';

export type ElementLocatorStrategy =
  | 'css' | 'xpath' | 'text' | 'role' | 'label' | 'placeholder' | 'testid' | 'vision';

export type BrowserStatus =
  | 'closed' | 'launching' | 'ready' | 'navigating' | 'loaded' | 'action' | 'error';

export type ReplayState = 'stopped' | 'playing' | 'paused' | 'complete';

export interface BrowserConfig {
  headless: boolean;
  viewport: { width: number; height: number };
  userAgent?: string;
  locale?: string;
  timezoneId?: string;
  geolocation?: { latitude: number; longitude: number };
  recordVideo: boolean;
  screenshotOnError: boolean;
  defaultTimeout: number;
  navigationTimeout: number;
  acceptDownloads: boolean;
  proxy?: { server: string; username?: string; password?: string };
  storageState?: string;
  extraLaunchArgs: string[];
}

export interface BrowserAction {
  id: string;
  type: BrowserActionType;
  timestamp: string;
  selector?: string;
  value?: string;
  url?: string;
  result?: unknown;
  error?: string;
  duration: number;
  screenshot?: string;
  domSnapshot?: string;
  metadata: Record<string, unknown>;
}

export interface DetectedElement {
  type: 'button' | 'input' | 'link' | 'select' | 'checkbox' |
         'radio' | 'image' | 'text' | 'heading' | 'table';
  tagName: string;
  text: string;
  selector: string;
  x: number; y: number; width: number; height: number;
  attributes: Record<string, string>;
  confidence: number;
  isVisible: boolean;
  isEnabled: boolean;
  ariaRole?: string;
  ariaLabel?: string;
}

export interface VisionAnalysisResult {
  elements: DetectedElement[];
  screenshot: string;
  timestamp: string;
  processingTime: number;
  ocrResults: Array<{
    text: string; x: number; y: number;
    width: number; height: number; confidence: number;
  }>;
  pageTitle?: string;
  pageUrl?: string;
}

export interface RecordingSession {
  id: string;
  startTime: string;
  endTime?: string;
  actions: BrowserAction[];
  metadata: {
    url: string;
    viewport: { width: number; height: number };
    userAgent: string;
    actionCount: number;
    totalDuration: number;
  };
  tags: string[];
}

export interface ReplayOptions {
  speed: number;
  stepByStep: boolean;
  breakpoints: string[];
  onStep?: (action: BrowserAction, index: number) => void;
  onError?: (action: BrowserAction, error: Error) => void;
  onComplete?: () => void;
}

export interface ComputerUseResult {
  success: boolean;
  action: BrowserAction;
  screenshot?: string;
  visionAnalysis?: VisionAnalysisResult;
  error?: string;
  duration: number;
  undoActionId?: string;
}

export interface BrowserSession {
  id: string;
  status: BrowserStatus;
  config: BrowserConfig;
  currentUrl?: string;
  startTime: string;
  actionCount: number;
  errorCount: number;
  recording?: RecordingSession;
  viewport: { width: number; height: number };
}

export interface ComputerUseStats {
  totalSessions: number;
  totalActions: number;
  totalErrors: number;
  uptimeMs: number;
  sessionDuration: number;
  avgActionDuration: number;
  successRate: number;
}

export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  headless: false,
  viewport: { width: 1280, height: 800 },
  recordVideo: false,
  screenshotOnError: true,
  defaultTimeout: 30_000,
  navigationTimeout: 60_000,
  acceptDownloads: true,
  extraLaunchArgs: [
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
  ],
};

export const ELEMENT_TIMEOUT = 10_000;
export const NAVIGATION_TIMEOUT = 60_000;
export const SCREENSHOT_QUALITY = 80;
export const MAX_RECORDING_ACTIONS = 1000;
export const VISION_CONFIDENCE_THRESHOLD = 0.7;

export const ACTION_TYPE_LABELS: Record<BrowserActionType, string> = {
  navigate: 'Navegar', click: 'Clicar', fill: 'Preencher',
  select: 'Selecionar', hover: 'Passar mouse', scroll: 'Rolar',
  extract: 'Extrair', screenshot: 'Capturar tela',
  evaluate: 'Executar script', wait: 'Aguardar',
  keyboard: 'Teclado', upload: 'Upload', download: 'Download',
  close: 'Fechar',
};
