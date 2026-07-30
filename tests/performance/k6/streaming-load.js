import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const latencyTrend = new Trend('stream_latency_ms');
const chunkTrend = new Trend('chunks_per_stream');

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.10'],
    stream_latency_ms: ['p95<5000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('streaming chat', () => {
    const payload = JSON.stringify({ messages: [{ role: 'user', content: 'streaming test' }], stream: true });
    const params = { headers: { 'Content-Type': 'application/json' }, timeout: '30s' };
    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/chat/completions`, payload, params);
    latencyTrend.add(Date.now() - start);
    const chunks = res.body ? res.body.split('\n').filter(l => l.startsWith('data:')).length : 0;
    chunkTrend.add(chunks);
    check(res, { 'stream 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  group('events SSE', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/events/stream`);
    latencyTrend.add(Date.now() - start);
    check(res, { 'sse 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  sleep(2);
}
