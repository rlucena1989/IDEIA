/**
 * Teste de fluxo ponta a ponta do MVP da IDE
 *
 * Cobre: policy ??? memory ??? audit ??? agent-runtime ??? preview/approve
 * N??o cobre: chat (requer Ollama rodando)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { evaluatePolicy } from '../../packages/policy-engine/src/policy';
import { MemoryStore } from '../../packages/memory-store/src/memory-store';
import { AuditTrail } from '../../packages/audit-trail/src/audit-trail';
import { AgentRuntime } from '../../packages/agent-runtime/src/agent-runtime';

describe('MVP Flow ??? Ponta a Ponta', () => {
  let tmpDir: string;
  let memoryStore: MemoryStore;
  let auditTrail: AuditTrail;
  let runtime: AgentRuntime;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mvp-e2e-'));
    memoryStore = new MemoryStore(path.join(tmpDir, 'memory.json'));
    auditTrail = new AuditTrail(path.join(tmpDir, 'audit.json'));
    runtime = new AgentRuntime(auditTrail, memoryStore, path.join(tmpDir, 'memory.json'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('Fluxo completo: inten????o ??? pol??tica ??? aprova????o ??? execu????o ??? auditoria ??? mem??ria', () => {
    // 1. Inten????o do usu??rio: "deletar arquivo de config"
    const intentActionType = 'file.delete';
    const intentResource = '/src/config.ts';

    // 2. Policy engine avalia
    const policy = evaluatePolicy({
      actionType: intentActionType,
      resource: intentResource,
      riskLevel: 'medium',
    });
    expect(policy.decision).toBe('ask'); // medium risk ??? precisa aprova????o

    // 3. Agent runtime processa
    const agent = runtime.run({
      message: 'Delete config file',
      actionType: intentActionType,
      resource: intentResource,
      riskLevel: 'medium',
    });
    expect(agent.decision).toBe('ask');
    expect(agent.steps).toContain('create approval request');

    // 4. Auditoria registra a decis??o
    auditTrail.append({
      actor: 'ai',
      eventType: 'policy.evaluate',
      target: intentActionType,
      decision: policy.decision,
      result: 'pending',
      metadata: { actionId: agent.actionId, reason: policy.reason },
    });
    expect(auditTrail.count()).toBe(1);

    // 5. Aprova????o humana
    auditTrail.append({
      actor: 'user',
      eventType: 'approval.approve',
      target: agent.actionId,
      decision: 'approved',
      result: 'success',
    });
    expect(auditTrail.count()).toBe(2);

    // 6. Execu????o
    auditTrail.append({
      actor: 'system',
      eventType: 'file.delete',
      target: intentResource,
      decision: 'auto',
      result: 'success',
    });
    expect(auditTrail.count()).toBe(3);

    // 7. Mem??ria atualizada
    const memory = memoryStore.load();
    memoryStore.pushDecision(memory, {
      actionId: agent.actionId,
      actionType: intentActionType,
      decision: 'approved',
      timestamp: new Date().toISOString(),
    });
    memoryStore.updateContext(memory, { lastAction: intentActionType, lastResource: intentResource });

    const updatedMemory = memoryStore.load();
    expect(updatedMemory.lastDecisions.length).toBe(1);
    expect(updatedMemory.context.lastAction).toBe('file.delete');

    // 8. Auditoria final rastre??vel
    const allEvents = auditTrail.load();
    expect(allEvents.map(e => e.eventType)).toEqual([
      'policy.evaluate',
      'approval.approve',
      'file.delete',
    ]);
  });

  test('Fluxo: a????o bloqueada n??o executa', () => {
    const agent = runtime.run({
      message: 'Format system disk',
      actionType: 'shell.exec',
      resource: 'format c:',
      riskLevel: 'high',
    });
    expect(agent.decision).toBe('block');
    expect(agent.steps).toContain('action blocked ??? notify user');

    auditTrail.append({
      actor: 'ai',
      eventType: 'policy.evaluate',
      target: 'shell.exec',
      decision: 'block',
      result: 'failure',
      metadata: { reason: agent.reason },
    });

    const events = auditTrail.load();
    expect(events[0].decision).toBe('block');
    expect(events[0].result).toBe('failure');
  });

  test('Fluxo: a????o auto n??o precisa de aprova????o', () => {
    const agent = runtime.run({
      message: 'Read the README',
      actionType: 'file.read',
      riskLevel: 'low',
    });
    expect(agent.decision).toBe('auto');
    expect(agent.steps).toContain('execute: file.read');
    expect(agent.steps).toContain('log result to audit trail');
    expect(agent.steps).toContain('update memory context');
  });
});
