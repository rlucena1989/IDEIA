import { check, sleep, group } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  return { startTime: Date.now() };
}

export default function (data: { startTime: number }) {
  group('chat completions', () => {
    const payload = JSON.stringify({
      messages: [{ role: 'user', content: 'test prompt for load testing' }],
    });

    const res = http.post(`${BASE_URL}/api/chat/completions`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
    });

    check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
    });
  });

  group('health check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health status 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}

export function teardown(data: { startTime: number }) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Test duration: ${duration}s`);
}
