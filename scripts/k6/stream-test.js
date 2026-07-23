import { check, sleep, group } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('SSE streaming', () => {
    const payload = JSON.stringify({
      messages: [{ role: 'user', content: 'stream test' }],
    });

    const res = http.post(`${BASE_URL}/api/chat/completions`, payload, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      timeout: '60s',
    });

    check(res, {
      'stream status 200': (r) => r.status === 200,
      'has event stream content': (r) => r.body.includes('event:'),
    });
  });

  sleep(2);
}
