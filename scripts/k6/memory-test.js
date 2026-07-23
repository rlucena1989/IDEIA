import { check, sleep, group } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '1m', target: 30 },
    { duration: '2m', target: 30 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('memory-intensive requests', () => {
    const payload = JSON.stringify({
      messages: [
        { role: 'user', content: 'analyze this codebase for patterns'.repeat(10) },
      ],
    });

    const res = http.post(`${BASE_URL}/api/chat/completions`, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: '30s',
    });

    check(res, {
      'status 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}
