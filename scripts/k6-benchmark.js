import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const ttftTrend = new Trend('ttft_ms');
const tpsTrend = new Trend('tps');
const memTrend = new Trend('memory_mb');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.05'],
    ttft_ms: ['p95<500', 'p99<1000'],
    tps: ['avg>10'],
    http_req_duration: ['p95<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('health endpoints', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/health`);
    ttftTrend.add(Date.now() - start);
    check(res, { 'health status 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('metrics endpoints', () => {
    const res = http.get(`${BASE_URL}/metrics`);
    check(res, { 'metrics status 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('api chat completions', () => {
    const payload = JSON.stringify({
      messages: [{ role: 'user', content: 'test prompt for benchmark' }],
    });
    const params = {
      headers: { 'Content-Type': 'application/json' },
      timeout: '10s',
    };
    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/chat/completions`, payload, params);
    ttftTrend.add(Date.now() - start);
    check(res, { 'chat status 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('event bus', () => {
    const res = http.get(`${BASE_URL}/api/events`);
    check(res, { 'events status 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  sleep(1);
}

export function handleSummary(data) {
  const metrics = {
    ttft: {
      avg: data.metrics.ttft_ms.values.avg,
      min: data.metrics.ttft_ms.values.min,
      med: data.metrics.ttft_ms.values.med,
      p95: data.metrics.ttft_ms.values['p(95)'],
      p99: data.metrics.ttft_ms.values['p(99)'],
    },
    requests: data.metrics.http_reqs,
    errors: data.metrics.errors,
    checks: data.metrics.checks,
  };

  const score = calculateScore(metrics);

  return {
    'stdout': JSON.stringify({ metrics, score, passed: score >= 60 }, null, 2),
  };
}

function calculateScore(metrics) {
  let score = 0;
  if (metrics.ttft.p95 < 500) score += 40;
  else if (metrics.ttft.p95 < 1000) score += 20;
  if (metrics.errors.rate < 0.01) score += 30;
  else if (metrics.errors.rate < 0.05) score += 15;
  if (metrics.checks.passes > metrics.checks.fails * 10) score += 30;
  return score;
}
