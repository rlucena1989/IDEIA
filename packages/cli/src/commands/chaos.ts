import { Command } from 'commander';
import { createLogger } from '@ideia/logger';
import { createBus, EventBus } from '@ideia/event-bus';
import { AuditTrail } from '@ideia/audit-trail';
import { SafetyCircuit, CircuitBreakerManager, SafetyArchitecture, EmergencyStop, createSafetyCircuit, createEmergencyStop } from '@ideia/safety-circuit';
import { SafetyReportGenerator } from '@ideia/safety-circuit';
import { printHeader, printLine, printResult } from '../utils/output';
const logger = createLogger('chaos');

interface ChaosTestResult {
  test: string;
  passed: boolean;
  details: string;
  durationMs: number;
}

export function chaosCommand(): Command {
  const cmd = new Command('chaos')
    .description('Chaos safety testing — stress test safety systems');

  let _bus: EventBus;
  async function getBus(): Promise<EventBus> {
    if (!_bus) _bus = await createBus() as unknown as EventBus;
    return _bus;
  }

  cmd
    .command('run')
    .description('Run full chaos test suite')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const results: ChaosTestResult[] = [];
      try {
        const bus = await getBus();
        const audit = new AuditTrail('.ai/audit/cli-trail.jsonl');

        results.push(await testLoopDetection(bus));
        results.push(await testRegressionSpike(bus));
        results.push(await testBreakageChain(bus));
        results.push(await testResourceExhaustion(bus));
        results.push(await testUserOverride(bus));
        results.push(await testCircuitBreakerTripping(bus));
        results.push(await testEmergencyStopEngage(bus, audit));
        results.push(await testSafetyArchitecture(bus, audit));
        results.push(await testAllLayersDegraded(bus, audit));
        results.push(await testBreakerReset(bus, audit));

        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;

        if (opts.json) { printLine(JSON.stringify({ results, summary: { total: results.length, passed, failed } }, null, 2)); return; }

        printHeader('Chaos Safety Test Results');
        for (const r of results) {
          const icon = r.passed ? '✓' : '✗';
          printLine(`  ${icon} ${r.test.padEnd(40)} ${r.passed ? 'PASS' : 'FAIL'}  (${r.durationMs}ms)`);
          if (!r.passed) printLine(`     ${r.details}`);
        }
        printLine('');
        printLine(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
        printResult(failed === 0 ? 'All chaos tests passed' : `${failed} test(s) failed`, failed === 0, `${passed}/${results.length}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Chaos test suite failed: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}

async function testLoopDetection(bus: EventBus): Promise<ChaosTestResult> {
  const start = Date.now();
  try {
    const sc = createSafetyCircuit(bus);
    let paused = false;
    for (let i = 0; i < 10; i++) {
      const decision = await sc.evaluate({ type: 'loop-detection', file: 'test.ts', details: `Iteration ${i}` });
      if (decision.action === 'pause') paused = true;
    }
    const status = sc.getStatus();
    return {
      test: 'loop-detection',
      passed: paused || status.activeTriggers.length > 0,
      details: `Loop detection ${paused ? 'triggered pause' : 'did not pause'} after 10 iterations. Active triggers: ${status.activeTriggers.length}`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { test: 'loop-detection', passed: false, details: `Error: ${String(err)}`, durationMs: Date.now() - start };
  }
}

async function testRegressionSpike(bus: EventBus): Promise<ChaosTestResult> {
  const start = Date.now();
  try {
    const sc = createSafetyCircuit(bus);
    await sc.evaluate({ type: 'regression-spike', metadata: { coverage: 80 } });
    const decision = await sc.evaluate({ type: 'regression-spike', metadata: { coverage: 70 } });
    return {
      test: 'regression-spike',
      passed: decision.action === 'rollback',
      details: `10% drop triggered action: ${decision.action}`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { test: 'regression-spike', passed: false, details: `Error: ${String(err)}`, durationMs: Date.now() - start };
  }
}

async function testBreakageChain(bus: EventBus): Promise<ChaosTestResult> {
  const start = Date.now();
  try {
    const sc = createSafetyCircuit(bus);
    let paused = false;
    for (let i = 0; i < 5; i++) {
      const decision = await sc.evaluate({ type: 'breakage-chain', details: `Contract break ${i}` });
      if (decision.action === 'pause') paused = true;
    }
    return {
      test: 'breakage-chain',
      passed: paused,
      details: `Breakage chain ${paused ? 'triggered pause' : 'did not pause'} after 5 breaks`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { test: 'breakage-chain', passed: false, details: `Error: ${String(err)}`, durationMs: Date.now() - start };
  }
}

async function testResourceExhaustion(bus: EventBus): Promise<ChaosTestResult> {
  const start = Date.now();
  try {
    const sc = createSafetyCircuit(bus);
    const decision = await sc.evaluate({ type: 'resource-exhaustion', metadata: { memoryPercent: 95, cpuPercent: 95 } });
    return {
      test: 'resource-exhaustion',
      passed: decision.action === 'degraded',
      details: `High resources triggered action: ${decision.action}`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { test: 'resource-exhaustion', passed: false, details: `Error: ${String(err)}`, durationMs: Date.now() - start };
  }
}

async function testUserOverride(bus: EventBus): Promise<ChaosTestResult> {
  const start = Date.now();
  try {
    const sc = createSafetyCircuit(bus);
    const decision = await sc.evaluate({ type: 'user-override', details: 'Chaos test stop' });
    return {
      test: 'user-override',
      passed: decision.action === 'stop',
      details: `User override triggered action: ${decision.action}`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { test: 'user-override', passed: false, details: `Error: ${String(err)}`, durationMs: Date.now() - start };
  }
}

async function testCircuitBreakerTripping(bus: EventBus): Promise<ChaosTestResult> {
  const start = Date.now();
  try {
    const audit = new AuditTrail('.ai/audit/cli-trail.jsonl');
    const cbm = new CircuitBreakerManager(bus, audit, [{ type: 'error-rate', enabled: true, threshold: 1, cooldownMs: 5000, action: 'stop' }]);
    const result = await cbm.evaluateSingle('error-rate', 5);
    return {
      test: 'circuit-breaker-tripping',
      passed: result.tripped,
      details: `High error rate (5 > 1) tripped: ${result.tripped} (action: ${result.action})`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { test: 'circuit-breaker-tripping', passed: false, details: `Error: ${String(err)}`, durationMs: Date.now() - start };
  }
}

async function testEmergencyStopEngage(bus: EventBus, audit: AuditTrail): Promise<ChaosTestResult> {
  const start = Date.now();
  try {
    const estop = createEmergencyStop(bus, audit);
    await estop.engage('cli', 'Chaos test emergency stop', 'chaos-test');
    const engaged = estop.isEngaged();
    await estop.recover('resume');
    return {
      test: 'emergency-stop-engage',
      passed: engaged,
      details: `Emergency stop ${engaged ? 'engaged' : 'failed to engage'}`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { test: 'emergency-stop-engage', passed: false, details: `Error: ${String(err)}`, durationMs: Date.now() - start };
  }
}

async function testSafetyArchitecture(bus: EventBus, audit: AuditTrail): Promise<ChaosTestResult> {
  const start = Date.now();
  try {
    const estop = createEmergencyStop(bus, audit);
    const sc = createSafetyCircuit(bus);
    const cbm = new CircuitBreakerManager(bus, audit);
    const arch = new SafetyArchitecture(undefined, bus, cbm, estop, sc);
    await arch.initialize();
    const statuses = arch.getAllStatuses();
    const allHealthy = statuses.every(s => s.status !== 'failed');
    return {
      test: 'safety-architecture-init',
      passed: statuses.length === 7 && allHealthy,
      details: `7 layers initialized: ${statuses.length}. All healthy: ${allHealthy}`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { test: 'safety-architecture-init', passed: false, details: `Error: ${String(err)}`, durationMs: Date.now() - start };
  }
}

async function testAllLayersDegraded(bus: EventBus, audit: AuditTrail): Promise<ChaosTestResult> {
  const start = Date.now();
  try {
    const estop = createEmergencyStop(bus, audit);
    const sc = createSafetyCircuit(bus);
    const cbm = new CircuitBreakerManager(bus, audit);
    const arch = new SafetyArchitecture(undefined, bus, cbm, estop, sc);
    await arch.initialize();

    const reportGen = new SafetyReportGenerator();
    const report = reportGen.generateReport(arch.getAllStatuses(), cbm.getStates());
    const hasFormat = reportGen.formatAsText(report).length > 0;
    return {
      test: 'safety-report-generation',
      passed: hasFormat && report.layers.length === 7,
      details: `Report generated: ${report.overallStatus}, layers: ${report.layers.length}`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { test: 'safety-report-generation', passed: false, details: `Error: ${String(err)}`, durationMs: Date.now() - start };
  }
}

async function testBreakerReset(bus: EventBus, audit: AuditTrail): Promise<ChaosTestResult> {
  const start = Date.now();
  try {
    const cbm = new CircuitBreakerManager(bus, audit, [{ type: 'error-rate', enabled: true, threshold: 1, cooldownMs: 5000, action: 'stop' }]);
    await cbm.evaluateSingle('error-rate', 5);
    const beforeReset = cbm.getStates().find(s => s.type === 'error-rate')!;
    cbm.resetBreaker('error-rate');
    const afterReset = cbm.getStates().find(s => s.type === 'error-rate')!;
    return {
      test: 'breaker-reset',
      passed: beforeReset.tripped && !afterReset.tripped,
      details: `Breaker tripped (${beforeReset.tripped}) then reset (${afterReset.tripped})`,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { test: 'breaker-reset', passed: false, details: `Error: ${String(err)}`, durationMs: Date.now() - start };
  }
}
