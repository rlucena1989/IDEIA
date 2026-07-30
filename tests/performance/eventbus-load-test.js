/**
 * k6 EventBus Load Test
 * Usage: k6 run tests/performance/eventbus-load-test.js
 * Tests NATS/EventBus throughput under load
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3001';
const errorRate = new Rate('event_errors');
const latencyTrend = new Trend('event_latency');

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    event_errors: ['rate<0.01'],
    event_latency: ['p(95)<1000'],
  },
};

const EVENT_TYPES = [
  'task.created', 'task.completed',
  'agent.started', 'agent.completed',
  'workflow.step', 'system.alert',
];

export default function () {
  const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];

  const payload = JSON.stringify({
    type: eventType,
    source: 'k6-load-test',
    payload: {
      id: `${__VU}-${__ITER}`,
      timestamp: new Date().toISOString(),
      data: 'x'.repeat(Math.floor(Math.random() * 200) + 50),
    },
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/events/emit`, payload, params);
  const elapsed = Date.now() - start;

  latencyTrend.add(elapsed);

  const success = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'response time < 1s': (r) => elapsed < 1000,
  });

  errorRate.add(!success);

  sleep(0.5 + Math.random());
}
