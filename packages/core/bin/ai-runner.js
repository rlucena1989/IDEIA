#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const ROOT = process.cwd();

console.log('=== AI-Devkit: Native Agent Runner ===\n');

const apiKey = config.get('OPENAI_API_KEY');
if (!apiKey) {
  console.error('❌ [FATAL] Variável de ambiente OPENAI_API_KEY ausente.');
  console.error('Configure OPENAI_API_KEY no .env ou no ambiente.');
  process.exit(1);
}

const baseUrl = config.get('OPENAI_BASE_URL') || 'https://api.openai.com/v1';
const model = config.get('OPENAI_MODEL') || 'gpt-4';

function loadContext() {
  const handoffPath = path.join(ROOT, '.ai', 'context', 'ai-handoff.md');
  const manifestPath = path.join(ROOT, '.ai', 'project-manifest.yaml');
  let context = '';

  if (fs.existsSync(handoffPath)) {
    context += `## AI Handoff\n${fs.readFileSync(handoffPath, 'utf8')}\n\n`;
  }
  if (fs.existsSync(manifestPath)) {
    context += `## Project Manifest\n${fs.readFileSync(manifestPath, 'utf8')}\n\n`;
  }
  return context || '(no context files found)';
}

function callApi(messages) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl.replace(/\/$/, '')}/chat/completions`);
    const payload = JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    });

    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? https : http;

    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`API ${res.statusCode}: ${data}`));
          }
          try {
            const json = JSON.parse(data);
            resolve(json.choices?.[0]?.message?.content || '(empty response)');
          } catch (e) {
            reject(new Error(`Parse error: ${e.message}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  const context = loadContext();
  const userPrompt = process.argv.slice(2).join(' ') || 'List the project files and suggest next steps.';

  const messages = [
    {
      role: 'system',
      content:
        'You are an AI development assistant integrated with AI-Devkit. Use the project context to answer.',
    },
    {
      role: 'user',
      content: `Project context:\n\n${context}\n\nUser request: ${userPrompt}`,
    },
  ];

  console.log(`📡 Calling ${baseUrl} (model: ${model})...\n`);

  try {
    const response = await callApi(messages);
    console.log('🤖 Response:\n');
    console.log(response);
  } catch (err) {
    console.error(`❌ API call failed: ${err.message}`);
    process.exit(1);
  }
}

main();
