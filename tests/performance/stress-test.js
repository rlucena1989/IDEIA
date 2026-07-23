/**
 * k6 Stress Test ??? Stress test for chat endpoint
 *
 * Usage:
 *   k6 run tests/performance/stress-test.js
 *   K6_BASE_URL=http://localhost:3001 k6 run tests/performance/stress-test.js
 *
 * Stages: ramp-up (30s) ??? high load (1m) ??? spike (30s) ??? ramp-down (30s)
 * Thresholds: error rate < 5%, P95 latency < 5s
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3001';

const errorRate = new Rate('errors');
const ttftTrend = new Trend('ttft');
const latencyTrend = new Trend('latency');

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.05'],
    http_req_duration: ['p(95)<5000'],
    latency: ['p(95)<5000'],
  },
};

const CHAT_PAYLOADS = [
  { message: 'Explain clean architecture', actionType: 'question' },
  { message: 'Generate a simple CRUD component', actionType: 'generate' },
  { message: 'Review this code', actionType: 'review' },
  { message: 'List all packages', actionType: 'query' },
  { message: 'Optimize the self-optimization engine', actionType: 'optimize' },
];

export default function () {
  const payload = CHAT_PAYLOADS[Math.floor(Math.random() * CHAT_PAYLOADS.length)];

  const start = Date.now();

  const res = http.post(`${BASE_URL}/api/chat`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  });

  const duration = Date.now() - start;
  latencyTrend.add(duration);

  const success = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'response time < 5s': (r) => r.timings.duration < 5000,
    'response has content': (r) => r.body && r.body.length > 0,
  });

  errorRate.add(!success);

  sleep(Math.random() * 2 + 0.5);
}
