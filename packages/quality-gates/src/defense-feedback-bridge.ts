import type { AgenticJudgeResult } from '@ideia/verification-layer'
import { createLogger } from '@ideia/logger';
import type { FeedbackPipeline } from '@ideia/feedback-pipeline'
import type { MemoryStore } from '@ideia/memory-store'
const logger = createLogger('defense-feedback-bridge');

export interface DefenseEvent {
  defenseId: string
  defenseName: string
  layer: number
  eventType: 'blocked' | 'warning' | 'passed'
  phase: string
  taskId: string
  details: string
  timestamp: string
}

export class DefenseFeedbackBridge {
  private feedbackPipeline?: FeedbackPipeline
  private memoryStore?: MemoryStore
  private events: DefenseEvent[] = []

  constructor(deps?: { feedbackPipeline?: FeedbackPipeline; memoryStore?: MemoryStore }) {
    this.feedbackPipeline = deps?.feedbackPipeline
    this.memoryStore = deps?.memoryStore
  }

  async recordDefenseEvent(event: DefenseEvent): Promise<void> {
    this.events.push(event)

    if (event.eventType === 'blocked' && this.feedbackPipeline) {
      this.feedbackPipeline.submit({
        type: 'issue',
        source: 'system',
        targetType: 'defense-gate',
        targetId: event.defenseId,
        content: `[Defense ${event.defenseName}] Blocked: ${event.details} (phase: ${event.phase})`,
        severity: 'error',
        tags: ['defense-gate', event.defenseName, event.phase],
      })
    }

    if (this.memoryStore) {
      this.memoryStore.append({
        memoryId: `defense-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        category: 'failure',
        source: `defense:${event.defenseName}`,
        summary: event.details,
        tags: ['defense', event.defenseName, event.eventType],
        createdAt: new Date().toISOString(),
        severity: event.eventType === 'blocked' ? 'high' : 'low',
        decision: { recommendationId: event.defenseId, status: event.eventType },
        context: { phase: event.phase, taskId: event.taskId, layer: event.layer },
      })
    }
  }

  async processJudgeResult(
    judgeResult: AgenticJudgeResult,
    phase: string,
    taskId: string,
  ): Promise<void> {
    const baseEvent = {
      defenseId: `judge-${Date.now()}`,
      defenseName: 'AgenticJudge',
      phase,
      taskId,
      timestamp: new Date().toISOString(),
    }

    if (judgeResult.verdict === 'fail') {
      await this.recordDefenseEvent({
        ...baseEvent,
        layer: 5,
        eventType: 'blocked',
        details: `Judge verdict: fail (score: ${judgeResult.score}, debt: ${judgeResult.structuralDebt})`,
      })
    }

    for (const issue of judgeResult.crossPhaseIssues) {
      await this.recordDefenseEvent({
        ...baseEvent,
        layer: 5,
        eventType: 'warning',
        details: `Cross-phase issue: ${issue}`,
      })
    }

    if (judgeResult.structuralDebt > 0.3) {
      await this.recordDefenseEvent({
        ...baseEvent,
        layer: 5,
        eventType: 'warning',
        details: `High structural debt (${judgeResult.structuralDebt}) — recommend refactor`,
      })
    }
  }

  getDefenseReport(): {
    total: number
    blocked: number
    warnings: number
    passed: number
    byDefense: Record<string, { total: number; blocked: number }>
  } {
    const byDefense: Record<string, { total: number; blocked: number }> = {}
    let blocked = 0
    let warnings = 0
    let passed = 0

    for (const event of this.events) {
      if (!byDefense[event.defenseName]) {
        byDefense[event.defenseName] = { total: 0, blocked: 0 }
      }
      byDefense[event.defenseName].total++
      if (event.eventType === 'blocked') {
        blocked++
        byDefense[event.defenseName].blocked++
      } else if (event.eventType === 'warning') {
        warnings++
      } else {
        passed++
      }
    }

    return {
      total: this.events.length,
      blocked,
      warnings,
      passed,
      byDefense,
    }
  }
}
