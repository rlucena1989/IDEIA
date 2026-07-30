import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const emitLatency = new Trend('emit_latency_ms');
const eventsReceived = new Counter('events_received');

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.05'],
    emit_latency_ms: ['p95<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('emit event', () => {
    const payload = JSON.stringify({ type: 'benchmark', payload: { timestamp: Date.now(), source: 'k6' } });
    const params = { headers: { 'Content-Type': 'application/json' }, timeout: '5s' };
    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/events`, payload, params);
    emitLatency.add(Date.now() - start);
    check(res, { 'emit 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
    if (res.status === 200) eventsReceived.add(1);
  });

  group('get events', () => {
    const res = http.get(`${BASE_URL}/api/events`);
    check(res, { 'list 200': (r) => r.status === 200 });
    errorRate.add(res.status !== 200);
  });

  sleep(1);
}
