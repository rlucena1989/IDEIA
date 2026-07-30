import { createLogger } from '@ideia/logger';
import { IEventBus } from '@ideia/event-bus';
import { ProjectScanResult } from './types';

const log = createLogger('project-scanner:bus');

export function wireScannerToPanel(bus: IEventBus, onScanComplete?: (result: ProjectScanResult) => void): () => void {
  const subs: string[] = [];

  bus.subscribe('project:scan', async (event: any) => {
    const payload = event.payload as Record<string, unknown> | undefined;
    const rootDir = payload?.rootDir as string ?? process.cwd();
    log.info('Scan requested via event bus', { rootDir });
  }).then((id: any) => subs.push(id));

  return () => {
    for (const id of subs) {
      bus.unsubscribe(id).catch((err: any) => log.error('Failed to unsubscribe', { error: String(err) }));
    }
  };
}

export function emitScanResult(bus: IEventBus, result: ProjectScanResult): void {
  bus.emit({
    type: 'project:scan:completed',
    source: 'project-scanner',
    payload: {
      projectName: result.projectName,
      findings: result.structure.files,
      critical: 0,
      recommendations: [],
      techs: result.techs,
      languages: result.languages,
      scannedAt: result.scannedAt,
      durationMs: result.durationMs,
    },
  }).catch((err: any) => {
    log.warn('Failed to emit scan result', { error: String(err) });
  });
}
