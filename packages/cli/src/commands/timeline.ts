import { Command } from "commander";
import { createLogger } from '@ideia/logger';
const logger = createLogger('commands.timeline');
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/** Interface que define a estrutura de timeline entry. */
export interface TimelineEntry {
  id: string;
  timestamp: string;
  event_type: string;
  actor: string;
  payload: Record<string, unknown>;
  prev_hash: string;
  hash: string;
}

const TIMELINE_DIR = ".ai/audit";
const TIMELINE_FILE = "timeline.jsonl";

function getTimelinePath(): string {
  return path.join(process.cwd(), TIMELINE_DIR, TIMELINE_FILE);
}

function ensureTimelineDir(): void {
  const dir = path.join(process.cwd(), TIMELINE_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function computeHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function getLastEntry(): TimelineEntry | null {
  const timelinePath = getTimelinePath();
  if (!fs.existsSync(timelinePath)) {
    return null;
  }

  const content = fs.readFileSync(timelinePath, "utf8").trim();
  if (!content) {
    return null;
  }

  const lines = content.split("\n");
  const lastLine = lines[lines.length - 1] ?? '';
  return JSON.parse(lastLine);
}

function appendEntry(entry: TimelineEntry): void {
  ensureTimelineDir();
  const timelinePath = getTimelinePath();
  fs.appendFileSync(timelinePath, JSON.stringify(entry) + "\n");
}

/**
 * Registra event.
 * @param eventType - Valor type.
 * @param actor - Valor actor.
 * @param payload - Valor payload.
 * @returns O resultado da operação.
 */
export function logEvent(
  eventType: string,
  actor: string,
  payload: Record<string, unknown>
): TimelineEntry {
  const lastEntry = getLastEntry();
  const prevHash = lastEntry ? lastEntry.hash : "0".repeat(64);

  const entry: TimelineEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    event_type: eventType,
    actor,
    payload,
    prev_hash: prevHash,
    hash: ""
  };

  const hashContent = JSON.stringify({
    id: entry.id,
    timestamp: entry.timestamp,
    event_type: entry.event_type,
    actor: entry.actor,
    payload: entry.payload,
    prev_hash: entry.prev_hash
  });

  entry.hash = computeHash(hashContent);
  appendEntry(entry);

  return entry;
}

/**
 * Processa timeline.
 * @returns O resultado da operação.
 */
export function verifyTimeline(): {
  valid: boolean;
  brokenAt: number;
  totalEntries: number;
} {
  const timelinePath = getTimelinePath();
  if (!fs.existsSync(timelinePath)) {
    return { valid: true, brokenAt: -1, totalEntries: 0 };
  }

  const content = fs.readFileSync(timelinePath, "utf8").trim();
  if (!content) {
    return { valid: true, brokenAt: -1, totalEntries: 0 };
  }

  const lines = content.split("\n");
  let prevHash = "0".repeat(64);

  for (let i = 0; i < lines.length; i++) {
    const entry: TimelineEntry = JSON.parse(lines[i] ?? '');

    if (entry.prev_hash !== prevHash) {
      return { valid: false, brokenAt: i, totalEntries: lines.length };
    }

    const hashContent = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      event_type: entry.event_type,
      actor: entry.actor,
      payload: entry.payload,
      prev_hash: entry.prev_hash
    });

    const expectedHash = computeHash(hashContent);
    if (entry.hash !== expectedHash) {
      return { valid: false, brokenAt: i, totalEntries: lines.length };
    }

    prevHash = entry.hash;
  }

  return { valid: true, brokenAt: -1, totalEntries: lines.length };
}

/**
 * Pesquisa timeline.
 * @param eventType - Valor type.
 * @param since - Valor since.
 * @returns O resultado da operação.
 */
export function searchTimeline(
  eventType?: string,
  since?: string
): TimelineEntry[] {
  const timelinePath = getTimelinePath();
  if (!fs.existsSync(timelinePath)) {
    return [];
  }

  const content = fs.readFileSync(timelinePath, "utf8").trim();
  if (!content) {
    return [];
  }

  const lines = content.split("\n");
  let entries: TimelineEntry[] = lines.map(line => JSON.parse(line));

  if (eventType) {
    entries = entries.filter(e => e.event_type === eventType);
  }

  if (since) {
    const sinceDate = new Date(since);
    entries = entries.filter(e => new Date(e.timestamp) >= sinceDate);
  }

  return entries;
}

/**
 * Processa timeline.
 * @returns O resultado da operação.
 */
export function exportTimeline(): TimelineEntry[] {
  const timelinePath = getTimelinePath();
  if (!fs.existsSync(timelinePath)) {
    return [];
  }

  const content = fs.readFileSync(timelinePath, "utf8").trim();
  if (!content) {
    return [];
  }

  return content.split("\n").map(line => JSON.parse(line));
}

/**
 * Processa command.
 * @returns O resultado da operação.
 */
export function timelineCommand(): Command {
  const timeline = new Command("timeline")
    .description("Gerencia audit timeline append-only com encadeamento criptográfico");

  timeline
    .command("log")
    .description("Registra evento na timeline")
    .requiredOption("-t, --type <type>", "Tipo do evento")
    .requiredOption("-a, --actor <actor>", "Ator responsável")
    .option("-p, --payload <json>", "Payload em JSON", "{}")
    .action((options) => {
      try {
        const payload = JSON.parse(options.payload);
        const entry = logEvent(options.type, options.actor, payload);
        logger.info('✅ Evento registrado na timeline:');
        console.log(JSON.stringify(entry, null, 2));
      } catch (e) {
        console.error("❌ Erro ao registrar evento:", e);
        process.exit(1);
      }
    });

  timeline
    .command("verify")
    .description("Valida integridade da cadeia de hashes")
    .action(() => {
      logger.info('\n🔐 Verificando integridade da Audit Timeline...\n');
      const result = verifyTimeline();

      if (result.totalEntries === 0) {
        logger.info('📭 Timeline vazia. Nenhum evento registrado.');
        return;
      }

      if (result.valid) {
        logger.info('✅ Timeline íntegra. Total de eventos: ${result.totalEntries}');
      } else {
        console.error(`❌ ALERTA: Adulteração detectada na entrada ${result.brokenAt + 1}.`);
        console.error("A cadeia de hashes foi quebrada. A timeline pode ter sido modificada.");
        process.exit(1);
      }
    });

  timeline
    .command("search")
    .description("Busca eventos na timeline")
    .option("-t, --type <type>", "Filtrar por tipo de evento")
    .option("-s, --since <date>", "Filtrar eventos desde data (ISO 8601)")
    .option("--json", "Retorna resultado em JSON")
    .action((options) => {
      const entries = searchTimeline(options.type, options.since);

      if (entries.length === 0) {
        logger.info('Nenhum evento encontrado.');
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(entries, null, 2));
      } else {
        logger.info('\n📋 Eventos encontrados: ${entries.length}\n');
        entries.forEach((entry, index) => {
          logger.info('${index + 1}. [${entry.timestamp}] ${entry.event_type}');
          logger.info('   Ator: ${entry.actor}');
          logger.info('   Payload: ${JSON.stringify(entry.payload)}');
          console.log();
        });
      }
    });

  timeline
    .command("export")
    .description("Exporta timeline completa em formato JSON")
    .action(() => {
      const entries = exportTimeline();
      console.log(JSON.stringify(entries, null, 2));
    });

  timeline
    .command("replay")
    .description("Reconstrói sequência de eventos")
    .action(() => {
      const entries = exportTimeline();

      if (entries.length === 0) {
        logger.info('Nenhum evento para replay.');
        return;
      }

      logger.info('\n🔄 Replay da Audit Timeline:\n');
      entries.forEach((entry, index) => {
        logger.info('[${index + 1}/${entries.length}] ${entry.timestamp}');
        logger.info('  Tipo: ${entry.event_type}');
        logger.info('  Ator: ${entry.actor}');
        logger.info('  Hash: ${entry.hash.substring(0, 16)}...');
        logger.info('  Prev: ${entry.prev_hash.substring(0, 16)}...');
        console.log();
      });
    });

  return timeline;
}
