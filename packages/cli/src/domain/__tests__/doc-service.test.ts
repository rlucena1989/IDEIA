jest.mock('../../governance/doc-resolver', () => ({
  resolveDocument: jest.fn(),
  resolveByTags: jest.fn(),
}));

jest.mock('../../governance/document-registry', () => ({
  listActiveDocuments: jest.fn(),
  findDocumentsByCategory: jest.fn(),
  findDocumentByPath: jest.fn(),
}));

jest.mock('../../governance/document-policy', () => ({
  getPolicy: jest.fn(),
  listPolicies: jest.fn(),
}));

jest.mock('../../governance/document-audit', () => ({
  runAudit: jest.fn(),
  detectConflicts: jest.fn(),
}));

import { resolveDocument, resolveByTags } from '../../governance/doc-resolver';
import { listActiveDocuments, findDocumentsByCategory, findDocumentByPath } from '../../governance/document-registry';
import { getPolicy, listPolicies } from '../../governance/document-policy';
import { runAudit, detectConflicts } from '../../governance/document-audit';

const mockResolveDocument = resolveDocument as jest.Mock;
const mockListActiveDocuments = listActiveDocuments as jest.Mock;
const mockFindDocumentsByCategory = findDocumentsByCategory as jest.Mock;
const mockGetPolicy = getPolicy as jest.Mock;
const mockListPolicies = listPolicies as jest.Mock;
const mockRunAudit = runAudit as jest.Mock;

describe('doc-service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('handleDocResolve', () => {
    it('returns blocked result when resolveDocument returns blocked', () => {
      mockResolveDocument.mockReturnValue({ primary: null, fallbacks: [], reason: 'No document found', blocked: true });

      const { handleDocResolve } = jest.requireActual('../doc-service');
      const result = handleDocResolve('unknown-task');

      expect(result.ok).toBe(false);
      expect(result.code).toBe(1);
      expect(result.error?.details).toBeDefined();
      expect(result.error?.details).toMatchObject({ blocked: true, primary: null });
    });

    it('returns success when resolution succeeds', () => {
      mockResolveDocument.mockReturnValue({ primary: { id: 'master-plan' }, fallbacks: [{ id: 'backlog' }], reason: 'Found it', blocked: false });

      const { handleDocResolve } = jest.requireActual('../doc-service');
      const result = handleDocResolve('strategy');

      expect(result.ok).toBe(true);
      expect(result.data?.blocked).toBe(false);
      expect(result.data?.primary).toEqual({ id: 'master-plan' });
    });
  });

  describe('handleDocAudit', () => {
    it('returns failure when status is blocked', () => {
      mockRunAudit.mockReturnValue({ conflicts: [{ severity: 'critical' }], status: 'blocked' });

      const { handleDocAudit } = jest.requireActual('../doc-service');
      const result = handleDocAudit();

      expect(result.ok).toBe(false);
      expect(result.code).toBe(1);
      expect(result.error?.details).toMatchObject({ status: 'blocked' });
    });

    it('returns success when status is clean', () => {
      mockRunAudit.mockReturnValue({ conflicts: [], status: 'clean' });

      const { handleDocAudit } = jest.requireActual('../doc-service');
      const result = handleDocAudit();

      expect(result.ok).toBe(true);
      expect(result.data?.status).toBe('clean');
    });

    it('returns success when status is warning', () => {
      mockRunAudit.mockReturnValue({ conflicts: [{ severity: 'medium' }], status: 'warning' });

      const { handleDocAudit } = jest.requireActual('../doc-service');
      const result = handleDocAudit();

      expect(result.ok).toBe(true);
      expect(result.data?.status).toBe('warning');
    });
  });

  describe('handleDocSources', () => {
    it('lists all active documents when no category', () => {
      mockListActiveDocuments.mockReturnValue([{ id: 'doc1' }, { id: 'doc2' }]);

      const { handleDocSources } = jest.requireActual('../doc-service');
      const result = handleDocSources();

      expect(result.ok).toBe(true);
      expect(result.data?.total).toBe(2);
      expect(result.data?.category).toBeUndefined();
    });

    it('filters by category when provided', () => {
      mockFindDocumentsByCategory.mockReturnValue([{ id: 'policy-doc' }]);

      const { handleDocSources } = jest.requireActual('../doc-service');
      const result = handleDocSources('policy');

      expect(result.ok).toBe(true);
      expect(result.data?.total).toBe(1);
      expect(result.data?.category).toBe('policy');
      expect(mockFindDocumentsByCategory).toHaveBeenCalledWith('policy');
    });
  });

  describe('handleDocPolicy', () => {
    it('returns a single policy for a given taskType', () => {
      mockGetPolicy.mockReturnValue({ taskType: 'execution', primaryDocument: 'current-task' });

      const { handleDocPolicy } = jest.requireActual('../doc-service');
      const result = handleDocPolicy('execution');

      expect(result.ok).toBe(true);
      expect(result.data?.policies).toHaveLength(1);
      expect(result.data?.taskType).toBe('execution');
    });

    it('returns empty array when taskType has no policy', () => {
      mockGetPolicy.mockReturnValue(undefined);

      const { handleDocPolicy } = jest.requireActual('../doc-service');
      const result = handleDocPolicy('nonexistent');

      expect(result.ok).toBe(true);
      expect(result.data?.policies).toEqual([]);
    });

    it('lists all policies when no taskType', () => {
      mockListPolicies.mockReturnValue([{ taskType: 'a' }, { taskType: 'b' }, { taskType: 'c' }]);

      const { handleDocPolicy } = jest.requireActual('../doc-service');
      const result = handleDocPolicy();

      expect(result.ok).toBe(true);
      expect(result.data?.policies).toHaveLength(3);
      expect(result.data?.taskType).toBeUndefined();
    });
  });

  describe('handleDocStatus', () => {
    it('returns aggregated status', () => {
      mockListActiveDocuments.mockReturnValue([{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }]);
      mockListPolicies.mockReturnValue([{ taskType: 'p1' }, { taskType: 'p2' }]);
      mockRunAudit.mockReturnValue({ conflicts: [{ severity: 'low' }], status: 'warning' });

      const { handleDocStatus } = jest.requireActual('../doc-service');
      const result = handleDocStatus();

      expect(result.ok).toBe(true);
      expect(result.data?.totalDocuments).toBe(3);
      expect(result.data?.totalPolicies).toBe(2);
      expect(result.data?.conflicts).toBe(1);
      expect(result.data?.status).toBe('warning');
    });
  });
});
