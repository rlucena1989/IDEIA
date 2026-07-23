#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const TIMELINE_PATH = path.join(__dirname, '..', 'audit', 'timeline.jsonl');

function enrichTimeline() {
  if (!fs.existsSync(TIMELINE_PATH)) {
    console.log('[enrich-timeline] No timeline found, skipping.');
    return;
  }
  const content = fs.readFileSync(TIMELINE_PATH, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const enriched = lines.map(line => {
    try {
      const entry = JSON.parse(line);
      if (!entry.event_type) entry.event_type = 'unknown';
      if (!entry.actor) entry.actor = { type: 'system', id: 'timeline' };
      return JSON.stringify(entry);
    } catch {
      return line;
    }
  });
  fs.writeFileSync(TIMELINE_PATH, enriched.join('\n') + '\n');
  console.log(`[enrich-timeline] Enriched ${enriched.length} entries`);
}

enrichTimeline();
