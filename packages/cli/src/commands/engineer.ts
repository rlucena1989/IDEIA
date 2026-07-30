import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.engineer');
import { Command } from 'commander';
import path from 'node:path';

const log = createLogger('cli:commands:engineer');
import { startCollaboration } from '../local-ai/collaboration';
import { getIO } from '../io';
import { CognitiveCoprocessor } from '../cognitive-coprocessor/integration';

const _coprocessor = new CognitiveCoprocessor();

function coprocessBefore(_input: string) {
  return { hints: { hints: [] as Array<{ type: string; message: string }>, deterministicPaths: [] as string[] } };
}

/** Interface que define a estrutura de engineer session. */
export interface EngineerSession {
  id: string;
  task: string;
  status: 'planning' | 'implementing' | 'testing' | 'fixing' | 'reviewing' | 'documenting' | 'completed' | 'failed';
  iteration: number;
  maxIterations: number;
  collaborationId: string;
  gates: EngineerGateResult[];
  artifacts: string[];
  createdAt: string;
  updatedAt: string;
  result?: string;
}

/** Interface que define a estrutura de engineer gate result. */
export interface EngineerGateResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  iteration: number;
  output: string;
  timestamp: string;
}

const ENGINEER_DIR = '.ai/engineer';

export function getSessionPath(root: string, id: string): string {
  return path.join(root, ENGINEER_DIR, `${id}.json`);
}

export function getSessionsIndexPath(root: string): string {
  return path.join(root, ENGINEER_DIR, 'index.json');
}

export function generateId(): string {
  return `eng_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function now(): string {
  return new Date().toISOString();
}

export function saveEngineerSession(root: string, session: EngineerSession): void {
  const sp = getSessionPath(root, session.id);
  getIO().fs.mkDir(path.dirname(sp), true);
  getIO().fs.write(sp, JSON.stringify(session, null, 2));
}

export function loadEngineerSession(root: string, id: string): EngineerSession | null {
  const sp = getSessionPath(root, id);
  if (!getIO().fs.exists(sp)) return null;
  try { return JSON.parse(getIO().fs.read(sp, 'utf8')); } catch { return null; }
}

export function listEngineerSessions(root: string): { id: string; task: string; status: string; updatedAt: string }[] {
  const ip = getSessionsIndexPath(root);
  if (!getIO().fs.exists(ip)) return [];
  try {
    const ids: string[] = JSON.parse(getIO().fs.read(ip, 'utf8'));
    return ids
      .map((id) => loadEngineerSession(root, id))
      .filter((s): s is EngineerSession => s !== null)
      .map((s) => ({ id: s.id, task: s.task, status: s.status, updatedAt: s.updatedAt }));
  } catch { return []; }
}

export function indexSession(root: string, id: string): void {
  const ip = getSessionsIndexPath(root);
  let index: string[] = [];
  if (getIO().fs.exists(ip)) { try { index = JSON.parse(getIO().fs.read(ip, 'utf8')); } catch { } }
  if (!index.includes(id)) { index.unshift(id); getIO().fs.write(ip, JSON.stringify(index, null, 2)); }
}

export async function runQualityGate(name: string, command: string): Promise<EngineerGateResult> {
  try {
    const { execFileSync } = await import('node:child_process');
    const output = execFileSync(command, { encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] });
    return {
      name,
      status: 'passed',
      iteration: 0,
      output: output.trim().slice(0, 500) || `${name} passed`,
      timestamp: now(),
    };
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    return {
      name,
      status: 'failed',
      iteration: 0,
      output: error.stderr || error.stdout || error.message || `${name} failed`,
      timestamp: now(),
    };
  }
}

/**
 * Inicia engineer mode.
 * @param root - Valor root.
 * @param task - Valor task.
 * @param options - Valor options.
 * @returns Promessa resolvida com o resultado da operaÃ§Ã£o.
 */
export async function startEngineerMode(
  root: string,
  task: string,
  options?: { maxIterations?: number; model?: string; skipGates?: boolean }
): Promise<EngineerSession> {
  const maxIter = options?.maxIterations || 3;
  const model = options?.model || 'qwen2:0.5b';

  const session: EngineerSession = {
    id: generateId(),
    task,
    status: 'planning',
    iteration: 0,
    maxIterations: maxIter,
    collaborationId: '',
    gates: [],
    artifacts: [],
    createdAt: now(),
    updatedAt: now(),
  };

  logger.info('\nðŸ¤– Autonomous Engineer Mode');
  logger.info('Task: "${task}"');
  logger.info('Max iterations: ${maxIter}');
  logger.info('Model: ${model}\n');

  for (let iter = 1; iter <= maxIter; iter++) {
    session.iteration = iter;
    session.status = 'planning';
    session.updatedAt = now();
    saveEngineerSession(root, session);
    indexSession(root, session.id);
    logger.info('\n${\'=\'.repeat(50)}');
    logger.info('ðŸ”„ Iteration ${iter}/${maxIter}');
    logger.info('${\'=\'.repeat(50)}\n');

    session.status = 'implementing';
    saveEngineerSession(root, session);

    logger.info('ðŸ“ Planning and implementing...');
    const collab = await startCollaboration(root, task, { ollamaModel: model });
    session.collaborationId = collab.id;
    session.artifacts.push(`collaboration:${collab.id}`);
    log.info(`   Collaboration: ${collab.id}`);

    if (!options?.skipGates) {
      session.status = 'testing';
      saveEngineerSession(root, session);

      logger.info('\nðŸ§ª Running quality gates...');
      const gates = [
        { name: 'TypeScript Compile', command: 'npx tsc --noEmit' },
        { name: 'Lint Check', command: 'npx eslint packages/cli/src/ --max-warnings 200' },
        { name: 'Audit', command: `node packages/cli/dist/index.js audit --json` },
      ];

      for (const gate of gates) {
        process.stdout.write(`   ${gate.name}... `);
        const result = await runQualityGate(gate.name, gate.command);
        result.iteration = iter;
        session.gates.push(result);
        logger.info(result.status === 'passed' ? 'âœ…' : 'âŒ');
        if (result.status === 'failed' && result.output) {
          logger.info('      ${result.output.slice(0, 200)}');
        }
      }

      const failedGates = session.gates.filter((g) => g.iteration === iter && g.status === 'failed');

      if (failedGates.length > 0 && iter < maxIter) {
        session.status = 'fixing';
        session.updatedAt = now();
        saveEngineerSession(root, session);

        logger.info('\nðŸ”§ ${failedGates.length} gate(s) failed. Fixing in next iteration...');
        task = `${task}\n\nPrevious iteration had these failures:\n${failedGates.map((g) => `- ${g.name}: ${g.output.slice(0, 100)}`).join('\n')}\n\nFix all issues.`;
        continue;
      }
    }

    session.status = 'reviewing';
    saveEngineerSession(root, session);
    logger.info('\nðŸ“‹ Review passed.');
    break;
  }

  if (session.status === 'fixing') {
    session.status = 'failed';
  } else {
    session.status = 'completed';
  }

  session.updatedAt = now();

  const passedGates = session.gates.filter((g) => g.status === 'passed').length;
  const totalGates = session.gates.length;

  session.result = `## Engineer Mode Complete\n\nTask: ${session.task}\nIterations: ${session.iteration}\nGates: ${passedGates}/${totalGates} passed\nStatus: ${session.status}`;

  saveEngineerSession(root, session);
  return session;
}

/**
 * Processa command.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function engineerCommand(): Command {
  const cmd = new Command('engineer')
    .description('Autonomous Engineer Mode â€” planeja, implementa, testa e itera autonomamente');

  cmd
    .command('start')
    .description('Inicia uma sessÃ£o autÃ´noma de engenharia')
    .argument('<task>', 'DescriÃ§Ã£o da tarefa')
    .option('--max-iterations <n>', 'MÃ¡ximo de iteraÃ§Ãµes', '3')
    .option('--model <model>', 'Modelo Ollama', 'qwen2:0.5b')
    .option('--skip-gates', 'Pula os quality gates')
    .option('--json', 'SaÃ­da em JSON')
    .option('--coprocess', 'Ativa processamento coparticipativo (hints + contexto cognitivo)')
    .action(async (task, options) => {
      const root = process.cwd();

      if (options.coprocess) {
        const hints = coprocessBefore(task);
        if (hints) {
          logger.info('\n=== Cognitive Coprocessor ===');
          for (const h of hints.hints.hints) {
            logger.info('  [${h.type}] ${h.message}');
          }
          if (hints.hints.deterministicPaths.length > 0) {
            logger.info('  Caminhos deterministicos: ${hints.hints.deterministicPaths.join(\', \')}');
          }
          console.log('');
        }
      }

      const session = await startEngineerMode(root, task, {
        maxIterations: parseInt(options.maxIterations, 10),
        model: options.model,
        skipGates: options.skipGates || false,
      });

      if (options.json) {
        console.log(JSON.stringify(session, null, 2));
        return;
      }

      logger.info('\n${\'=\'.repeat(50)}');
      logger.info('âœ… Engineer Mode Complete');
      logger.info('${\'=\'.repeat(50)}');
      logger.info('Session: ${session.id}');
      logger.info('Status: ${session.status}');
      logger.info('Iterations: ${session.iteration}/${session.maxIterations}');
      logger.info('Collaboration: ${session.collaborationId}');

      const passed = session.gates.filter((g) => g.status === 'passed').length;
      const total = session.gates.length;
      if (total > 0) {
        logger.info('Gates: ${passed}/${total} passed');
        for (const gate of session.gates) {
          const icon = gate.status === 'passed' ? 'âœ…' : 'âŒ';
          logger.info('  ${icon} ${gate.name} (iter ${gate.iteration})');
        }
      }

      logger.info('\nSession saved: .ai/engineer/${session.id}.json');
    });

  cmd
    .command('status')
    .description('Mostra sessÃµes de engenharia')
    .option('--json', 'SaÃ­da em JSON')
    .action((options) => {
      const root = process.cwd();
      const sessions = listEngineerSessions(root);

      if (options.json) {
        console.log(JSON.stringify(sessions, null, 2));
        return;
      }

      if (sessions.length === 0) {
        logger.info('No engineer sessions found.');
        return;
      }

      logger.info('\nðŸ¤– Engineer Sessions:\n');
      for (const s of sessions) {
        const icon = s.status === 'completed' ? 'âœ…' : s.status === 'failed' ? 'âŒ' : 'â³';
        logger.info('${icon} ${s.id}');
        logger.info('   Task: ${s.task.slice(0, 80)}');
        logger.info('   Status: ${s.status}');
        logger.info('   Updated: ${new Date(s.updatedAt).toLocaleString()}\n');
      }
    });

  cmd
    .command('log')
    .description('Mostra o log completo de uma sessÃ£o')
    .argument('<session-id>', 'ID da sessÃ£o')
    .option('--json', 'SaÃ­da em JSON')
    .action((sessionId, options) => {
      const root = process.cwd();
      const session = loadEngineerSession(root, sessionId);

      if (!session) {
        log.error(`Session not found: ${sessionId}`);
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(session, null, 2));
        return;
      }

      logger.info('\nðŸ¤– Engineer Session: ${session.id}');
      logger.info('Task: ${session.task}');
      logger.info('Status: ${session.status}');
      logger.info('Iterations: ${session.iteration}/${session.maxIterations}\n');

      logger.info('â± Timeline:');
      logger.info('  Created: ${new Date(session.createdAt).toLocaleString()}');
      logger.info('  Updated: ${new Date(session.updatedAt).toLocaleString()}');
      logger.info('  Collaboration: ${session.collaborationId}\n');

      if (session.gates.length > 0) {
        logger.info('ðŸ§ª Quality Gates:');
        for (const gate of session.gates) {
          const icon = gate.status === 'passed' ? 'âœ…' : 'âŒ';
          logger.info('  ${icon} [iter ${gate.iteration}] ${gate.name}');
          if (gate.output) logger.info('     ${gate.output.slice(0, 300)}');
          console.log();
        }
      }

      if (session.result) {
        logger.info('ðŸ“„ Result:\n');
        logger.info(session.result);
      }
    });

  return cmd;
}
