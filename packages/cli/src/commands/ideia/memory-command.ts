import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import { MemoryStore } from '@ideia/memory-store';
import { createEnvelope } from '../../hardening/output-contract';
import { getCliVersion } from '../../utils/version';

interface IdeiaMemoryRecord {
  id: string;
  type: 'decision' | 'lesson' | 'pattern' | 'preference';
  title: string;
  description: string;
  timestamp: string;
  tags: string[];
}

const store = new MemoryStore();

function loadIdeiaMemory(): IdeiaMemoryRecord[] {
  try {
    const memoryPath = path.join(process.cwd(), '.ai', 'memory', 'ideia-memory.json');
    if (fs.existsSync(memoryPath)) {
      return JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
    }
  } catch {}
  return [];
}

function saveIdeiaMemory(records: IdeiaMemoryRecord[]): void {
  const memoryPath = path.join(process.cwd(), '.ai', 'memory');
  if (!fs.existsSync(memoryPath)) fs.mkdirSync(memoryPath, { recursive: true });
  fs.writeFileSync(path.join(memoryPath, 'ideia-memory.json'), JSON.stringify(records, null, 2));
}

export function ideiaMemoryCommand(): Command {
  const cmd = new Command('memory')
    .description('Gestão de memória e aprendizado do IDEIA');

  cmd
    .command('show')
    .description('Mostra registros de memória')
    .option('--type <type>', 'Filtrar por tipo (decision, lesson, pattern, preference)')
    .option('--json', 'Saída em JSON')
    .action((opts) => {
      try {
        let records = loadIdeiaMemory();
        const storeRecords = store.list();

        if (opts.type) {
          records = records.filter(r => r.type === opts.type);
        }

        if (opts.json) {
          console.log(JSON.stringify({
            ideia: { count: records.length, records },
            operational: { count: storeRecords.length, records: storeRecords.slice(-10) },
          }, null, 2));
          return;
        }

        console.log(`\n${'='.repeat(56)}`);
        console.log('  🧠 IDEIA — Memória');
        console.log(`${'='.repeat(56)}\n`);

        if (records.length === 0 && storeRecords.length === 0) {
          console.log('  Nenhum registro de memória encontrado.\n');
          return;
        }

        if (records.length > 0) {
          console.log('  📚 Memória IDEIA:\n');
          for (const r of records) {
            const icon = r.type === 'decision' ? '📌' : r.type === 'lesson' ? '🎓' : r.type === 'pattern' ? '🔧' : '⭐';
            console.log(`  ${icon} [${r.type}] ${r.title}`);
            console.log(`     ${r.description.slice(0, 100)}`);
            console.log(`     Tags: ${r.tags.join(', ')}`);
            console.log(`     ${r.timestamp}\n`);
          }
        }

        if (storeRecords.length > 0) {
          console.log('  📋 Memória Operacional (últimas 10):\n');
          for (const r of storeRecords.slice(-10)) {
            const icon = r.severity === 'critical' ? '❌' : r.severity === 'high' ? '⚠️' : '📝';
            console.log(`  ${icon} [${r.category}] ${r.summary.slice(0, 80)}`);
            console.log('');
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('search')
    .description('Pesquisa na memória por texto')
    .argument('<query>', 'Texto para buscar')
    .option('--json', 'Saída em JSON')
    .action((query: string, opts) => {
      try {
        const records = loadIdeiaMemory();
        const lowerQuery = query.toLowerCase();

        const results = records.filter(r =>
          r.title.toLowerCase().includes(lowerQuery) ||
          r.description.toLowerCase().includes(lowerQuery) ||
          r.tags.some(t => t.toLowerCase().includes(lowerQuery))
        );

        const storeResults = store.search(query);

        if (opts.json) {
          console.log(JSON.stringify({ query, results: { ideia: results, operational: storeResults } }, null, 2));
          return;
        }

        console.log(`\n${'='.repeat(56)}`);
        console.log(`  🔍 IDEIA — Pesquisa: "${query}"`);
        console.log(`${'='.repeat(56)}\n`);

        if (results.length === 0 && storeResults.length === 0) {
          console.log('  Nenhum resultado encontrado.\n');
          return;
        }

        if (results.length > 0) {
          console.log(`  📚 Memória IDEIA (${results.length}):\n`);
          for (const r of results) {
            console.log(`  • [${r.type}] ${r.title}`);
            console.log(`    ${r.description.slice(0, 120)}`);
            console.log('');
          }
        }

        if (storeResults.length > 0) {
          console.log(`  📋 Memória Operacional (${storeResults.length}):\n`);
          for (const r of storeResults.slice(-5)) {
            console.log(`  • ${r.summary.slice(0, 80)}`);
            console.log('');
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('add')
    .description('Adiciona um registro à memória')
    .argument('<type>', 'Tipo (decision, lesson, pattern, preference)')
    .argument('<title>', 'Título do registro')
    .argument('<description>', 'Descrição detalhada')
    .option('--tags <tags>', 'Tags separadas por vírgula')
    .action((type: string, title: string, description: string, opts) => {
      try {
        const validTypes = ['decision', 'lesson', 'pattern', 'preference'];
        if (!validTypes.includes(type)) {
          console.error(`\n❌ Tipo inválido: "${type}". Use: ${validTypes.join(', ')}\n`);
          process.exit(1);
        }

        const tags = opts.tags ? opts.tags.split(',').map((t: string) => t.trim()) : [];
        const records = loadIdeiaMemory();

        const record: IdeiaMemoryRecord = {
          id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: type as IdeiaMemoryRecord['type'],
          title,
          description,
          timestamp: new Date().toISOString(),
          tags,
        };

        records.push(record);
        saveIdeiaMemory(records);

        console.log(`\n✅ Registro adicionado à memória: "${title}"\n`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  cmd
    .command('clear')
    .description('Limpa todos os registros de memória')
    .option('--force', 'Confirma a limpeza sem prompt')
    .action((opts) => {
      try {
        if (!opts.force) {
          console.log('\n  ⚠ Use --force para confirmar a limpeza da memória.\n');
          return;
        }

        const memoryPath = path.join(process.cwd(), '.ai', 'memory', 'ideia-memory.json');
        if (fs.existsSync(memoryPath)) {
          fs.writeFileSync(memoryPath, JSON.stringify([], null, 2));
        }

        console.log('\n✅ Memória limpa.\n');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n❌ Erro: ${message}`);
        process.exit(1);
      }
    });

  return cmd;
}
