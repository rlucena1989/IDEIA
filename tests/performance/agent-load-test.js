/**
 * k6 Agent Load Test
 * Usage: k6 run tests/performance/agent-load-test.js
 * Stages: ramp-up (1m) → steady (2m) → ramp-down (1m)
 * Tests: agent execution, task creation, status polling
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:3001';
const errorRate = new Rate('agent_errors');
const ttftTrend = new Trend('ttft');
const executionTrend = new Trend('execution_time');

export const options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    agent_errors: ['rate<0.02'],
    ttft: ['p(95)<5000'],
    execution_time: ['p(95)<30000'],
  },
};

const AGENT_TASKS = [
  { task: 'explain clean architecture', type: 'question' },
  { task: 'generate class diagram', type: 'generate' },
  { task: 'review code for security issues', type: 'review' },
  { task: 'refactor this function', type: 'refactor' },
  { task: 'write unit tests', type: 'test' },
];

export default function () {
  const task = AGENT_TASKS[Math.floor(Math.random() * AGENT_TASKS.length)];

  const payload = JSON.stringify({
    message: task.task,
    actionType: task.type,
    stream: false,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '60s',
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/agent/execute`, payload, params);
  const totalTime = Date.now() - start;

  ttftTrend.add(res.timings.waiting || totalTime);
  executionTrend.add(totalTime);

  const success = check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'response has body': (r) => r.body && r.body.length > 0,
    'response time < 30s': (r) => totalTime < 30000,
  });

  errorRate.add(!success);

  sleep(Math.random() * 3 + 1);
}
