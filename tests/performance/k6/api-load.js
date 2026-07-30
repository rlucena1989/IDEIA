import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const latencyTrend = new Trend('latency_ms');

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
    latency_ms: ['p95<1000', 'p99<2000'],
    http_req_duration: ['p95<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('health', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/health`);
    latencyTrend.add(Date.now() - start);
    check(res, { 'health 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('metrics', () => {
    const res = http.get(`${BASE_URL}/metrics`);
    check(res, { 'metrics 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('chat completion', () => {
    const payload = JSON.stringify({ messages: [{ role: 'user', content: 'benchmark test' }] });
    const params = { headers: { 'Content-Type': 'application/json' }, timeout: '10s' };
    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/chat/completions`, payload, params);
    latencyTrend.add(Date.now() - start);
    check(res, { 'chat 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  sleep(1);
}
