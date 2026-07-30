import { describe, it, expect, beforeEach } from '@jest/globals';
import { AuditExporter } from '../src/exporter';
import { ExportFormat, ExportFilter, ExporterConfig } from '../src/types';
import { AuditEvent } from '@ideia/audit-trail';

describe('AuditExporter', () => {
  let exporter: AuditExporter;
  let config: ExporterConfig;
  let mockEvents: AuditEvent[];

  beforeEach(() => {
    config = {
      defaultFormat: 'json',
      outputDir: '/tmp/audit-exports',
      maxEntries: 100,
    };
    exporter = new AuditExporter(config);
    mockEvents = [
      {
        eventId: 'evt-001',
        timestamp: '2024-01-01T00:00:00Z',
        actor: 'user',
        eventType: 'create',
        target: 'resource-1',
        decision: 'approved',
        approvalStatus: 'approved',
        result: 'success',
        previousHash: 'hash-001',
      },
      {
        eventId: 'evt-002',
        timestamp: '2024-01-02T00:00:00Z',
        actor: 'system',
        eventType: 'update',
        target: 'resource-2',
        decision: 'rejected',
        approvalStatus: 'rejected',
        result: 'failure',
        previousHash: 'hash-002',
      },
    ];
  });

  describe('constructor', () => {
    it('should create exporter with config', () => {
      expect(exporter).toBeInstanceOf(AuditExporter);
    });
  });

  describe('exportToJson', () => {
    it('should export events to JSON format', () => {
      const result = exporter.exportToJson(mockEvents);
      expect(result.format).toBe('json');
      expect(result.entries).toBe(2);
      expect(result.totalCount).toBe(2);
      expect(result.generatedAt).toBeDefined();
    });

    it('should apply filter by event type', () => {
      const filter: ExportFilter = { eventType: 'create' };
      const result = exporter.exportToJson(mockEvents, filter);
      expect(result.entries).toBe(1);
    });

    it('should apply filter by actor', () => {
      const filter: ExportFilter = { actor: 'user' };
      const result = exporter.exportToJson(mockEvents, filter);
      expect(result.entries).toBe(1);
    });

    it('should apply filter by date range', () => {
      const filter: ExportFilter = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-01T23:59:59Z',
      };
      const result = exporter.exportToJson(mockEvents, filter);
      expect(result.entries).toBe(1);
    });

    it('should respect maxEntries limit', () => {
      const limitedConfig: ExporterConfig = { ...config, maxEntries: 1 };
      const limitedExporter = new AuditExporter(limitedConfig);
      const result = limitedExporter.exportToJson(mockEvents);
      expect(result.entries).toBe(1);
    });
  });

  describe('exportToCsv', () => {
    it('should export events to CSV format', () => {
      const result = exporter.exportToCsv(mockEvents);
      expect(result.format).toBe('csv');
      expect(result.entries).toBe(2);
      expect(result.totalCount).toBe(2);
    });

    it('should escape CSV special characters', () => {
      const eventsWithSpecialChars: AuditEvent[] = [
        {
          eventId: 'evt-003',
          timestamp: '2024-01-03T00:00:00Z',
          actor: 'user',
          eventType: 'create',
          target: 'resource,with,commas',
          decision: 'approved',
          approvalStatus: 'approved',
          result: 'success',
          previousHash: 'hash-003',
        },
      ];
      const result = exporter.exportToCsv(eventsWithSpecialChars);
      expect(result.format).toBe('csv');
      expect(result.entries).toBe(1);
    });
  });

  describe('exportToHtml', () => {
    it('should export events to HTML format', () => {
      const result = exporter.exportToHtml(mockEvents);
      expect(result.format).toBe('html');
      expect(result.entries).toBe(2);
      expect(result.totalCount).toBe(2);
      expect(result.generatedAt).toBeDefined();
    });

    it('should escape HTML special characters', () => {
      const eventsWithHtmlChars: AuditEvent[] = [
        {
          eventId: 'evt-004',
          timestamp: '2024-01-04T00:00:00Z',
          actor: 'user',
          eventType: 'create',
          target: 'resource-4',
          decision: 'approved',
          approvalStatus: 'approved',
          result: 'success',
          previousHash: 'hash-004',
        },
      ];
      const result = exporter.exportToHtml(eventsWithHtmlChars);
      expect(result.format).toBe('html');
      expect(result.entries).toBe(1);
    });
  });

  describe('filtering', () => {
    it('should return all events when no filter provided', () => {
      const result = exporter.exportToJson(mockEvents);
      expect(result.entries).toBe(2);
    });

    it('should filter by target', () => {
      const filter: ExportFilter = { target: 'resource-1' };
      const result = exporter.exportToJson(mockEvents, filter);
      expect(result.entries).toBe(1);
    });

    it('should handle empty filter result', () => {
      const filter: ExportFilter = { actor: 'non-existent' };
      const result = exporter.exportToJson(mockEvents, filter);
      expect(result.entries).toBe(0);
    });
  });
});
