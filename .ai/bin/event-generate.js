#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const { parseArgs, printHelp, ensureDir, log, info, warn } = require('./lib/common');
const { toPascalCase, toCamelCase, toKebabCase } = require('../generators/helpers/naming');

const args = parseArgs(process.argv.slice(2));

if (args.help || args._.length === 0) {
  printHelp(
    'event-generate.js — Gera eventos e handlers com EventBus',
    'node .ai/bin/event-generate.js <EventName> [--module <name>] [--handler] [--listener]',
    [
      '--module <name>  Modulo destino (default: events/)',
      '--handler        Gerar handler para o evento',
      '--listener       Registrar listener no EventBus',
    ]
  );
  process.exit(0);
}

const eventName = args._[0];
const moduleName = args.module || 'events';
const withHandler = !!args.handler;
const withListener = !!args.listener;

const Name = toPascalCase(eventName);
const name = toCamelCase(eventName);
const nameKebab = toKebabCase(eventName);
const moduleKebab = toKebabCase(moduleName);
const templateDir = path.join(__dirname, '..', 'generators', 'templates', 'event');

const basePath = path.join(process.cwd(), 'src', 'modules', moduleKebab, 'events');
const templateData = {
  Name,
  name,
  nameKebab,
  eventFile: `${Name}Event`,
};

function renderTemplate(file, data) {
  const tpl = fs.readFileSync(path.join(templateDir, file), 'utf-8');
  return Handlebars.compile(tpl)(data);
}

const files = [];

files.push({
  relPath: `${Name}Event.ts`,
  content: renderTemplate('event.ts.hbs', templateData),
});

if (withHandler) {
  files.push({
    relPath: `${Name}Handler.ts`,
    content: renderTemplate('handler.ts.hbs', templateData),
  });
}

const eventBusPath = path.join(process.cwd(), 'src', 'modules', moduleKebab, 'events', 'EventBus.ts');
if (!fs.existsSync(eventBusPath)) {
  files.push({
    relPath: 'EventBus.ts',
    content: `import { IEvent } from './${Name}Event';

type Handler<T = unknown> = (event: IEvent<T>) => void | Promise<void>;

export class EventBus {
  private static instance: EventBus;
  private handlers: Map<string, Handler[]> = new Map();

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  register<T>(eventName: string, handler: Handler<T>): void {
    const list = this.handlers.get(eventName) || [];
    list.push(handler as Handler);
    this.handlers.set(eventName, list);
  }

  async emit<T>(event: IEvent<T>): Promise<void> {
    const list = this.handlers.get(event.eventName) || [];
    for (const handler of list) {
      await handler(event);
    }
  }

  clear(eventName?: string): void {
    if (eventName) {
      this.handlers.delete(eventName);
    } else {
      this.handlers.clear();
    }
  }
}
`,
  });
}

if (withListener) {
  const listenerContent = `import { EventBus } from './EventBus';
import { ${Name}Event } from './${Name}Event';
${withHandler ? `import { ${Name}Handler } from './${Name}Handler';` : ''}

const bus = EventBus.getInstance();
${withHandler ? `const handler = new ${Name}Handler();\nbus.register(${Name}Event.eventName, (e) => handler.handle(e));` : `bus.register(${Name}Event.eventName, (e) => {\n  console.log('Received:', e);\n});`}

export { bus };
`;
  files.push({
    relPath: `${Name}Listener.ts`,
    content: listenerContent,
  });
}

let created = 0;
let skipped = 0;

for (const file of files) {
  const fullPath = path.join(basePath, file.relPath);
  if (fs.existsSync(fullPath)) {
    warn(`Skip (exists): ${path.relative(process.cwd(), fullPath)}`);
    skipped++;
    continue;
  }
  ensureDir(path.dirname(fullPath));
  fs.writeFileSync(fullPath, file.content, 'utf-8');
  log(`Create: ${path.relative(process.cwd(), fullPath)}`);
  created++;
}

console.log('');
info(`Event: ${Name}`);
info(`Module: ${moduleKebab}`);
info(`Created: ${created} | Skipped: ${skipped} | Total: ${files.length}`);
