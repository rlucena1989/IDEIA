#!/usr/bin/env node

/**
 * LLM Evaluation Script — DeepEval-compatible assertions
 *
 * Measures: factual correctness, relevancy, hallucination detection
 * Outputs: JSON results
 *
 * Usage:
 *   node .ai/quality/llm-eval.js              # run all tests
 *   node .ai/quality/llm-eval.js --cli          # CLI mode with summary
 */

// ---------------------------------------------------------------------------
// DeepEval-compatible assertion primitives
// ---------------------------------------------------------------------------

function assertFactualCorrectness(actual, expected, threshold = 0.7) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const aTokens = new Set(normalize(actual).split(/\s+/).filter(Boolean));
  const eTokens = new Set(normalize(expected).split(/\s+/).filter(Boolean));
  if (eTokens.size === 0) return { pass: false, score: 0, reason: 'empty reference' };
  let matchCount = 0;
  for (const t of eTokens) { if (aTokens.has(t)) matchCount++; }
  const score = matchCount / eTokens.size;
  return { pass: score >= threshold, score: Math.round(score * 100) / 100, reason: score >= threshold ? 'factual match' : 'factual mismatch' };
}

function assertRelevancy(output, context, threshold = 0.5) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const oTokens = new Set(normalize(output).split(/\s+/).filter(Boolean));
  const cTokens = new Set(normalize(context).split(/\s+/).filter(Boolean));
  if (oTokens.size === 0) return { pass: false, score: 0, reason: 'empty output' };
  let overlap = 0;
  for (const t of oTokens) { if (cTokens.has(t)) overlap++; }
  const score = overlap / oTokens.size;
  return { pass: score >= threshold, score: Math.round(score * 100) / 100, reason: score >= threshold ? 'relevant' : 'low relevancy' };
}

function assertNoHallucination(output, source, threshold = 0.3) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const oTokens = new Set(normalize(output).split(/\s+/).filter(Boolean));
  const sTokens = new Set(normalize(source).split(/\s+/).filter(Boolean));
  if (oTokens.size === 0) return { pass: true, score: 1, reason: 'empty output — no hallucination' };
  if (sTokens.size === 0) return { pass: false, score: 0, reason: 'empty source — cannot verify' };
  let extraneous = 0;
  for (const t of oTokens) { if (!sTokens.has(t)) extraneous++; }
  const hallucinationRate = extraneous / oTokens.size;
  return { pass: hallucinationRate <= threshold, score: Math.round((1 - hallucinationRate) * 100) / 100, reason: hallucinationRate <= threshold ? 'no hallucination' : `possible hallucination (${(hallucinationRate * 100).toFixed(0)}% extraneous)` };
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

const TEST_CASES = [
  {
    name: 'factual: code output matches expected',
    fn: () => assertFactualCorrectness(
      'function add(a, b) { return a + b; }',
      'function add(a, b) { return a + b; }',
    ),
  },
  {
    name: 'factual: partial mismatch within threshold',
    fn: () => assertFactualCorrectness(
      'function add(a, b) { return a + b; } // nice',
      'function add(a, b) { return a + b; }',
      0.7,
    ),
  },
  {
    name: 'factual: complete mismatch fails',
    fn: () => assertFactualCorrectness(
      'const x = 42;',
      'function add(a, b) { return a + b; }',
      0.5,
    ),
  },
  {
    name: 'relevancy: output relevant to context',
    fn: () => assertRelevancy(
      'use React hooks for state management',
      'React functional components manage state with hooks like useState and useEffect',
    ),
  },
  {
    name: 'relevancy: off-topic output fails',
    fn: () => assertRelevancy(
      'the weather is nice today',
      'React functional components manage state with hooks like useState and useEffect',
      0.3,
    ),
  },
  {
    name: 'hallucination: no hallucination when aligned',
    fn: () => assertNoHallucination(
      'the user authentication module uses JWT tokens',
      'the user authentication module uses JWT tokens for secure API access',
    ),
  },
  {
    name: 'hallucination: detects invented facts',
    fn: () => assertNoHallucination(
      'the user authentication module uses quantum cryptography and blockchain',
      'the user authentication module uses JWT tokens for secure API access',
      0.3,
    ),
  },
  {
    name: 'hallucination: empty output passes',
    fn: () => assertNoHallucination('', 'some source content'),
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function run() {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    try {
      const result = tc.fn();
      results.push({ name: tc.name, ...result });
      if (result.pass) passed++; else failed++;
    } catch (err) {
      results.push({ name: tc.name, pass: false, score: 0, reason: `error: ${err.message}` });
      failed++;
    }
  }

  return { results, summary: { total: results.length, passed, failed, passRate: results.length > 0 ? Math.round((passed / results.length) * 100) : 0 } };
}

// ---------------------------------------------------------------------------
// CLI mode
// ---------------------------------------------------------------------------

async function cli() {
  const { results, summary } = await run();
  console.log(JSON.stringify({ results, summary }, null, 2));

  console.error('\n=== LLM Evaluation Summary ===');
  console.error(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed} | Pass Rate: ${summary.passRate}%`);
  console.error('==============================\n');

  process.exit(summary.failed > 0 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

if (require.main === module || process.argv.includes('--cli')) {
  cli();
}

module.exports = { run, assertFactualCorrectness, assertRelevancy, assertNoHallucination };
