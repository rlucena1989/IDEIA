import { AuditEvent } from '@ideia/audit-trail';
import { createLogger } from '@ideia/logger';
const logger = createLogger('types');

export type ExportFormat = 'json' | 'csv' | 'html' | 'pdf';

export interface ExportFilter {
  startDate?: string;
  endDate?: string;
  eventType?: string;
  actor?: string;
  target?: string;
}

export interface ExportResult {
  format: ExportFormat;
  entries: number;
  totalCount: number;
  generatedAt: string;
  filePath?: string;
}

export interface ExporterConfig {
  defaultFormat: ExportFormat;
  outputDir: string;
  maxEntries: number;
}
