/**
 * k6 Load Test ??? Basic load test for API endpoints
 *
 * Usage:
 *   k6 run tests/performance/load-test.js
 *   K6_BASE_URL=http://localhost:3001 k6 run tests/performance/load-test.js
 *
 * Stages: ramp-up (30s) ??? steady (1m) ??? ramp-down (30s)
 * Thresholds: error rate < 1%, P95 latency < 2s
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3001';

const errorRate = new Rate('errors');
const latencyTrend = new Trend('latency');

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    errors: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    latency: ['p(95)<2000'],
  },
};

export default function () {
  const payloads = [
    { endpoint: '/api/health', method: 'GET', body: null },
    { endpoint: '/api/status', method: 'GET', body: null },
    { endpoint: '/api/self/status', method: 'GET', body: null },
  ];

  for (const req of payloads) {
    const start = Date.now();
    const params = { headers: { 'Content-Type': 'application/json' } };

    let res;
    if (req.method === 'GET') {
      res = http.get(`${BASE_URL}${req.endpoint}`, params);
    } else {
      res = http.post(`${BASE_URL}${req.endpoint}`, JSON.stringify(req.body), params);
    }

    const duration = Date.now() - start;
    latencyTrend.add(duration);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
    });

    errorRate.add(!success);

    sleep(1);
  }
}
