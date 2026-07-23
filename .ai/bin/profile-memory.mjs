#!/usr/bin/env node

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const here = () => path.resolve(__dirname, '../..');

const fmt = (label, m) => {
  const rss = `${(m.rss / 1024 / 1024).toFixed(1)} MB`;
  const heap = `${(m.heapUsed / 1024 / 1024).toFixed(1)} MB`;
  const ext = `${(m.external / 1024 / 1024).toFixed(1)} MB`;
  console.log(`${label}: RSS=${rss} | Heap=${heap} | External=${ext}`);
};

fmt('Baseline (Node up)', process.memoryUsage());

const cliBin = path.join(here(), 'packages/cli/dist/index.js');
for (const cmd of ['generate', 'orchestrate', 'review']) {
  try {
    const start = process.memoryUsage();
    execSync(`node "${cliBin}" ${cmd} --help`, { timeout: 12000 });
    const end = process.memoryUsage();
    const rssMB = ((end.rss - start.rss) / 1024 / 1024).toFixed(1);
    const heapMB = ((end.heapUsed - start.heapUsed) / 1024 / 1024).toFixed(1);
    console.log(`${cmd} --help: delta RSS=${rssMB} MB delta Heap=${heapMB} MB`);
  } catch (e) {
    console.log(`${cmd} --help: skipped — ${String(e.status || 'error')}`);
  }
}
