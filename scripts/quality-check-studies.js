#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ESTUDOS_DIR = path.join(ROOT, 'plans', 'estudos');

const results = { pass: 0, fail: 0, warn: 0 };
const errors = [];

function ok(label) { results.pass++; }
function warn(label, detail) { results.warn++; console.warn('  \u26A0 ' + label + ': ' + detail); }
function fail(label, detail) { results.fail++; errors.push('  \u274C ' + label + ': ' + detail); }

function getFiles() {
  return fs.readdirSync(ESTUDOS_DIR).filter(f => f.endsWith('.md') || f.endsWith('.html'));
}

function readFile(name) {
  try { return fs.readFileSync(path.join(ESTUDOS_DIR, name), 'utf8'); }
  catch { return null; }
}

function runAllChecks() {
  console.log('\n=== QUALITY CHECK: ESTUDOS ===\n');
  const files = getFiles();
  checkIndexConsistency(files);
  checkEncoding(files);
  checkNaming(files);
  checkStructure(files);
  checkIntensification(files);
  checkDuplicates(files);
  printSummary();
}

function checkIndexConsistency(files) {
  const content = readFile('00-INDICE.md');
  if (!content) { fail('00-INDICE.md', 'Could not read index file'); return; }
  const indexRefs = new Set();
  const fileRefRegex = /\`([\w\-]+\.(?:md|html))\`/g;
  let m;
  while ((m = fileRefRegex.exec(content)) !== null) { indexRefs.add(m[1]); }
  let unreferenced = 0;
  for (const f of files) {
    if (f === '00-INDICE.md') continue;
    if (!indexRefs.has(f)) {
      if (!content.includes(f)) {
        fail(f, 'File exists but is NOT referenced in 00-INDICE.md');
        unreferenced++;
      } else {
        warn(f, 'Referenced in index but without backtick formatting');
      }
    }
  }
  for (const ref of indexRefs) {
    if (!files.includes(ref)) {
      fail('00-INDICE.md', 'References file "' + ref + '" which does NOT exist');
    }
  }
  if (unreferenced === 0) ok('Index consistency: All files referenced');
}

function checkEncoding(files) {
  let corrupted = 0;
  for (const f of files) {
    const content = readFile(f);
    if (!content) continue;
    const clean = content.replace(/[à-üÀ-Üâ-ûÂ-Ûã-õÃ-ÕçÇªº0-9\s]/g, '');
    if (/\uFFFD/.test(clean)) { warn(f, 'UTF replacement char found'); corrupted++; continue; }
  }
  if (corrupted === 0) ok('Encoding: No UTF-8 corruption');
}

function checkNaming(files) {
  let valid = 0;
  for (const f of files) {
    if (f === '00-INDICE.md' || f === 'ide-mockup.html' || f === 'TEMPLATE-INTENSIFICACAO.md') { valid++; continue; }
    if (/^(META|50[A-Z]?|9[0-9][A-Z]?)-/.test(f)) { valid++; continue; }
    if (/^\d{2}-/.test(f)) { valid++; continue; }
    fail(f, 'Does not follow naming pattern');
  }
  ok('Naming: ' + valid + '/' + files.length + ' files follow conventions');
}

function checkStructure(files) {
  const required = [
    { name: 'title', pat: /^#\s+/m },
    { name: 'data/date', pat: /[Dd]ata\s*:/ },
    { name: 'prop\u00f3sito', pat: /Prop\u00f3sito|Objetivo/ },
  ];
  let compliant = 0;
  for (const f of files) {
    if (f === '00-INDICE.md' || f === 'TEMPLATE-INTENSIFICACAO.md') continue;
    const content = readFile(f);
    if (!content) continue;
    const missing = required.filter(r => !r.pat.test(content)).map(r => r.name);
    if (missing.length > 0 && missing.length < 3) warn(f, 'Missing sections: ' + missing.join(', '));
    else if (missing.length >= 3) fail(f, 'Missing all required sections');
    else compliant++;
  }
  ok('Structure: ' + compliant + ' files have required sections');
}

function checkIntensification(files) {
  const subsections = ['Corporativo', 'Acad\u00eamico', 'C\u00f3digo de Refer\u00eancia', 'Benchmarks', 'Concorr\u00eancia', 'Riscos Conhecidos', 'Refer\u00eancias da Pesquisa'];
  let complete = 0;
  let hasIntens = 0;
  for (const f of files) {
    if (f === '00-INDICE.md' || f === 'TEMPLATE-INTENSIFICACAO.md') continue;
    const content = readFile(f);
    if (!content) continue;
    const hasHeading = content.indexOf('Pesquisa Aprofundada') > -1;
    if (!hasHeading || f === 'ide-mockup.html') continue;
    hasIntens++;
    const allPresent = subsections.every(s => content.indexOf(s) > -1);
    if (allPresent) complete++;
    else {
      const missing = subsections.filter(s => content.indexOf(s) === -1);
      warn(f, 'Intensification missing subsections: ' + missing.join(', '));
    }
  }
  ok('Intensification: ' + complete + '/' + hasIntens + ' files have all 7 subsections');
}

function checkDuplicates(files) {
  let dupCount = 0;
  for (const f of files) {
    const content = readFile(f);
    if (!content) continue;
    const heading = '\uD83D\uDD2C Pesquisa Aprofundada';
    const matches = content.match(new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    if (matches && matches.length > 1) {
      fail(f, 'Duplicate intensification heading (' + matches.length + 'x)');
      dupCount++;
    }
  }
  if (dupCount === 0) ok('Duplicates: No duplicate intensification sections');
}

function printSummary() {
  console.log('\n=== SUMMARY ===');
  console.log('  Pass: ' + results.pass);
  console.log('  Warn: ' + results.warn);
  console.log('  Fail: ' + results.fail);
  if (errors.length > 0) {
    console.log('\nFailures:');
    errors.forEach(e => console.log(e));
  }
  const total = results.pass + results.warn + results.fail;
  const score = total > 0 ? Math.round((results.pass / total) * 100) : 100;
  console.log('\nQuality score: ' + score + '% (' + results.pass + '/' + total + ' checks passed)');
  process.exit(results.fail > 0 ? 1 : 0);
}

runAllChecks();
