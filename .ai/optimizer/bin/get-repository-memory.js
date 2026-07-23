#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readYaml(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const data = {};
  let currentSection = null;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed === '') continue;
    const sectionMatch = trimmed.match(/^(\w+):$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      data[currentSection] = [];
      continue;
    }
    if (currentSection && trimmed.startsWith('- id:')) {
      const entry = { id: trimmed.replace('- id:', '').trim().replace(/"/g, '') };
      data[currentSection].push(entry);
    }
    if (currentSection && data[currentSection].length > 0) {
      const last = data[currentSection][data[currentSection].length - 1];
      const descMatch = trimmed.match(/description:\s*["']?(.+?)["']?$/);
      if (descMatch) last.description = descMatch[1];
      const tagMatch = trimmed.match(/tags:\s*\[(.+?)\]/);
      if (tagMatch) last.tags = tagMatch[1].split(',').map((t) => t.trim().replace(/"/g, ''));
    }
  }
  return data;
}

function scoreTextMatch(text, tags) {
  let score = 0;
  for (const tag of tags || []) {
    if (text.includes(tag.toLowerCase())) score += 1;
  }
  return score;
}

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const requestPath = process.argv[2];
  if (!requestPath) {
    console.error('Usage: get-repository-memory.js <request.json>');
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const root = process.cwd();
  const request = JSON.parse(fs.readFileSync(path.resolve(root, requestPath), 'utf8'));
  const text = `${request.summary || ''} ${request.details || ''} ${(request.files || []).join(' ')}`.toLowerCase();

  const patternsPath = path.join(root, '.ai/optimizer/memory/patterns.yaml');
  const decisionsPath = path.join(root, '.ai/optimizer/memory/decisions.yaml');
  const incidentsPath = path.join(root, '.ai/optimizer/memory/incidents.yaml');

  const patterns = fs.existsSync(patternsPath) ? (readYaml(patternsPath).patterns || []) : [];
  const decisions = fs.existsSync(decisionsPath) ? (readYaml(decisionsPath).decisions || []) : [];
  const incidents = fs.existsSync(incidentsPath) ? (readYaml(incidentsPath).incidents || []) : [];

  const matches = {
    patterns: patterns
      .map((p) => ({ ...p, score: scoreTextMatch(text, p.tags) }))
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score),
    decisions: decisions
      .map((d) => ({ ...d, score: scoreTextMatch(text, d.tags) }))
      .filter((d) => d.score > 0)
      .sort((a, b) => b.score - a.score),
    incidents: incidents
      .map((i) => ({ ...i, score: scoreTextMatch(text, i.tags) }))
      .filter((i) => i.score > 0)
      .sort((a, b) => b.score - a.score)
  };

  const outDir = path.join(root, '.ai/optimizer/runtime');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'latest-memory.json'), JSON.stringify(matches, null, 2), 'utf8');

  console.log(JSON.stringify(matches, null, 2));
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
