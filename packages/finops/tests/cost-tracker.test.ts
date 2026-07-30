import { describe, it, expect, beforeEach } from '@jest/globals';
import { CostTracker } from '../src/cost-tracker';
import { CostRecord, CostSource, Currency, Environment } from '../src/types';

describe('CostTracker', () => {
  let tracker: CostTracker;
  let mockRecords: CostRecord[];

  beforeEach(() => {
    tracker = new CostTracker(1000);
    mockRecords = [
      {
        id: 'cost-1',
        source: 'llm',
        provider: 'openai',
        service: 'gpt-4',
        region: 'us-east-1',
        amount: 10.50,
        currency: 'USD',
        timestamp: new Date('2024-01-01'),
        project: 'project-a',
        environment: 'prod',
        tags: {},
        metadata: { model: 'gpt-4' },
      },
      {
        id: 'cost-2',
        source: 'compute',
        provider: 'aws',
        service: 'ec2',
        region: 'us-east-1',
        amount: 25.00,
        currency: 'USD',
        timestamp: new Date('2024-01-02'),
        project: 'project-a',
        environment: 'prod',
        tags: {},
        metadata: {},
      },
      {
        id: 'cost-3',
        source: 'llm',
        provider: 'anthropic',
        service: 'claude-3',
        region: 'us-west-2',
        amount: 15.75,
        currency: 'USD',
        timestamp: new Date('2024-01-03'),
        project: 'project-b',
        environment: 'dev',
        tags: {},
        metadata: { model: 'claude-3' },
      },
    ];
  });

  describe('constructor', () => {
    it('should create tracker with default max records', () => {
      const tracker = new CostTracker();
      expect(tracker).toBeInstanceOf(CostTracker);
    });

    it('should create tracker with custom max records', () => {
      const tracker = new CostTracker(100);
      expect(tracker).toBeInstanceOf(CostTracker);
    });
  });

  describe('record', () => {
    it('should record a cost record', async () => {
      await tracker.record(mockRecords[0]);
      expect(tracker.getRecordCount()).toBe(1);
    });

    it('should respect max records limit', async () => {
      const smallTracker = new CostTracker(2);
      await smallTracker.record(mockRecords[0]);
      await smallTracker.record(mockRecords[1]);
      await smallTracker.record(mockRecords[2]);
      expect(smallTracker.getRecordCount()).toBe(2);
    });
  });

  describe('recordBatch', () => {
    it('should record multiple records', async () => {
      await tracker.recordBatch(mockRecords);
      expect(tracker.getRecordCount()).toBe(3);
    });
  });

  describe('getTotalCost', () => {
    it('should get total cost without filters', async () => {
      await tracker.recordBatch(mockRecords);
      const total = tracker.getTotalCost();
      expect(total).toBe(51.25);
    });

    it('should filter by source', async () => {
      await tracker.recordBatch(mockRecords);
      const total = tracker.getTotalCost('llm');
      expect(total).toBe(26.25);
    });

    it('should filter by date', async () => {
      await tracker.recordBatch(mockRecords);
      const since = new Date('2024-01-02');
      const total = tracker.getTotalCost(undefined, since);
      expect(total).toBe(40.75);
    });
  });

  describe('getCostBySource', () => {
    it('should group costs by source', async () => {
      await tracker.recordBatch(mockRecords);
      const bySource = tracker.getCostBySource();
      expect(bySource['llm']).toBe(26.25);
      expect(bySource['compute']).toBe(25.00);
    });
  });

  describe('getCostByProject', () => {
    it('should group costs by project', async () => {
      await tracker.recordBatch(mockRecords);
      const byProject = tracker.getCostByProject();
      expect(byProject['project-a']).toBe(35.50);
      expect(byProject['project-b']).toBe(15.75);
    });
  });

  describe('getCostByProvider', () => {
    it('should group costs by provider', async () => {
      await tracker.recordBatch(mockRecords);
      const byProvider = tracker.getCostByProvider();
      expect(byProvider['openai']).toBe(10.50);
      expect(byProvider['aws']).toBe(25.00);
      expect(byProvider['anthropic']).toBe(15.75);
    });
  });

  describe('getCostByModel', () => {
    it('should group costs by model from metadata', async () => {
      await tracker.recordBatch(mockRecords);
      const byModel = tracker.getCostByModel();
      expect(byModel['gpt-4']).toBe(10.50);
      expect(byModel['claude-3']).toBe(15.75);
    });
  });

  describe('getDailyTotals', () => {
    it('should return daily totals', async () => {
      await tracker.recordBatch(mockRecords);
      const totals = tracker.getDailyTotals(3);
      expect(totals).toHaveLength(3);
      expect(totals[0]).toBe(10.50);
      expect(totals[1]).toBe(25.00);
      expect(totals[2]).toBe(15.75);
    });
  });

  describe('getDailyAverage', () => {
    it('should calculate daily average', async () => {
      await tracker.recordBatch(mockRecords);
      const avg = tracker.getDailyAverage(3);
      expect(avg).toBeCloseTo(17.08, 2);
    });
  });

  describe('getRecords', () => {
    it('should return records with pagination', async () => {
      await tracker.recordBatch(mockRecords);
      const records = tracker.getRecords(2, 0);
      expect(records).toHaveLength(2);
    });

    it('should return all records without limit', async () => {
      await tracker.recordBatch(mockRecords);
      const records = tracker.getRecords();
      expect(records).toHaveLength(3);
    });
  });

  describe('clear', () => {
    it('should clear all records', async () => {
      await tracker.recordBatch(mockRecords);
      tracker.clear();
      expect(tracker.getRecordCount()).toBe(0);
    });
  });
});
