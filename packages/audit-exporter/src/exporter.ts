import fs from 'fs';
import path from 'path';
import { AuditEvent } from '@ideia/audit-trail';
import { createLogger } from '@ideia/logger';
import { ExportFormat, ExportFilter, ExportResult, ExporterConfig } from './types';

type IndexableAuditEvent = AuditEvent & Record<string, unknown>;

const log = createLogger('audit-exporter');

export class AuditExporter {
  constructor(private config: ExporterConfig) {}

  private applyFilter(entries: AuditEvent[], filter?: ExportFilter): AuditEvent[] {
    if (!filter) return entries;
    return entries.filter(e => {
      if (filter.startDate && e.timestamp < filter.startDate) return false;
      if (filter.endDate && e.timestamp > filter.endDate) return false;
      if (filter.eventType && e.eventType !== filter.eventType) return false;
      if (filter.actor && e.actor !== filter.actor) return false;
      if (filter.target && e.target !== filter.target) return false;
      return true;
    });
  }

  private generateTimestamp(): string {
    return new Date().toISOString();
  }

  private writeFile(content: string, ext: string): string | undefined {
    const timestamp = Date.now();
    const fileName = `audit-export-${timestamp}.${ext}`;
    const filePath = path.join(this.config.outputDir, fileName);
    try {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
      fs.writeFileSync(filePath, content, 'utf-8');
      log.info('Export written to file', { filePath });
      return filePath;
    } catch (err) {
      log.error('Failed to write export file', { filePath, error: String(err) });
      return undefined;
    }
  }

  private buildResult(format: ExportFormat, entries: AuditEvent[], filePath?: string): ExportResult {
    return {
      format,
      entries: entries.length,
      totalCount: entries.length,
      generatedAt: this.generateTimestamp(),
      filePath,
    };
  }

  exportToJson(entries: AuditEvent[], filter?: ExportFilter, writeToFile?: boolean): ExportResult {
    const filtered = this.applyFilter(entries, filter);
    const max = this.config.maxEntries;
    const slice = max > 0 ? filtered.slice(0, max) : filtered;
    const content = JSON.stringify(slice, null, 2);
    const filePath = writeToFile ? this.writeFile(content, 'json') : undefined;
    return this.buildResult('json', slice, filePath);
  }

  exportToCsv(entries: AuditEvent[], filter?: ExportFilter, writeToFile?: boolean): ExportResult {
    const filtered = this.applyFilter(entries, filter);
    const max = this.config.maxEntries;
    const slice = max > 0 ? filtered.slice(0, max) : filtered;
    const headers = ['eventId', 'timestamp', 'actor', 'eventType', 'target', 'decision', 'approvalStatus', 'result', 'previousHash'];
    const escapeCsv = (val: unknown): string => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const lines: string[] = [headers.join(',')];
    for (const e of slice) {
      const row = headers.map(h => escapeCsv((e as IndexableAuditEvent)[h]));
      lines.push(row.join(','));
    }
    const content = lines.join('\r\n');
    const filePath = writeToFile ? this.writeFile(content, 'csv') : undefined;
    return this.buildResult('csv', slice, filePath);
  }

  exportToHtml(entries: AuditEvent[], filter?: ExportFilter, writeToFile?: boolean): ExportResult {
    const filtered = this.applyFilter(entries, filter);
    const max = this.config.maxEntries;
    const slice = max > 0 ? filtered.slice(0, max) : filtered;
    const rows = slice.map(e => {
      const metaStr = e.metadata ? JSON.stringify(e.metadata) : '';
      return `<tr>
        <td>${this.escapeHtml(e.eventId)}</td>
        <td>${this.escapeHtml(e.timestamp)}</td>
        <td>${this.escapeHtml(String(e.actor))}</td>
        <td>${this.escapeHtml(e.eventType)}</td>
        <td>${this.escapeHtml(e.target)}</td>
        <td>${this.escapeHtml(String(e.decision))}</td>
        <td>${this.escapeHtml(e.approvalStatus ?? '')}</td>
        <td>${this.escapeHtml(String(e.result))}</td>
        <td>${this.escapeHtml(metaStr)}</td>
      </tr>`;
    }).join('\n      ');
    const content = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Audit Trail Export</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; color: #333; }
  h1 { font-size: 1.5em; border-bottom: 2px solid #eee; padding-bottom: 8px; }
  table { border-collapse: collapse; width: 100%; font-size: 0.85em; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background-color: #f5f5f5; font-weight: 600; }
  tr:nth-child(even) { background-color: #fafafa; }
  .meta { font-size: 0.8em; color: #666; }
  .footer { margin-top: 16px; font-size: 0.8em; color: #999; }
</style>
</head>
<body>
<h1>Audit Trail Export</h1>
<p>Generated: ${this.escapeHtml(this.generateTimestamp())} | Total entries: ${slice.length}</p>
<table>
<thead>
<tr>
  <th>Event ID</th>
  <th>Timestamp</th>
  <th>Actor</th>
  <th>Event Type</th>
  <th>Target</th>
  <th>Decision</th>
  <th>Approval</th>
  <th>Result</th>
  <th>Metadata</th>
</tr>
</thead>
<tbody>
      ${rows}
</tbody>
</table>
<div class="footer">IDEIA Audit Exporter</div>
</body>
</html>`;
    const filePath = writeToFile ? this.writeFile(content, 'html') : undefined;
    return this.buildResult('html', slice, filePath);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
