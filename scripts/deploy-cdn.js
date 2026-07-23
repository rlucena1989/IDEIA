/**
 * CDN Deploy Script — Upload static assets to CDN
 *
 * Usage:
 *   node scripts/deploy-cdn.js                    # Deploy to default CDN
 *   node scripts/deploy-cdn.js --dry-run           # Preview without uploading
 *   node scripts/deploy-cdn.js --provider vercel   # Vercel deployment
 *   node scripts/deploy-cdn.js --dir dist          # Custom directory
 *   node scripts/deploy-cdn.js --json              # JSON output
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

interface CdnAsset {
  path: string;
  size: number;
  type: string;
  hash: string;
}

const ASSET_TYPES: Record<string, string> = {
  '.js': 'application/javascript',
  '.ts': 'application/x-typescript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
};

function getAssetType(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  return ASSET_TYPES[ext] || 'application/octet-stream';
}

function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function collectAssets(dir: string, baseDir: string): CdnAsset[] {
  const assets: CdnAsset[] = [];
  const entries: string[] = [];

  try {
    const fs = require('node:fs');
    const walkDir = (current: string) => {
      const items = fs.readdirSync(current, { withFileTypes: true });
      for (const item of items) {
        const fullPath = resolve(current, item.name);
        if (item.isDirectory() && !item.name.startsWith('_') && item.name !== 'node_modules') {
          walkDir(fullPath);
        } else if (item.isFile()) {
          entries.push(fullPath);
        }
      }
    };
    walkDir(dir);

    for (const entry of entries) {
      const content = readFileSync(entry, 'utf-8');
      const relPath = relative(baseDir, entry);
      assets.push({
        path: relPath.replace(/\\/g, '/'),
        size: content.length,
        type: getAssetType(entry),
        hash: simpleHash(content),
      });
    }
  } catch {
    // Directory may not exist
  }

  return assets.sort((a, b) => b.size - a.size);
}

async function deploy() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const jsonOutput = args.includes('--json');
  const provider = args.includes('--provider')
    ? args[args.indexOf('--provider') + 1]
    : 'static';

  const dirIndex = args.indexOf('--dir');
  let assetsDir = resolve(ROOT, 'dist');
  if (dirIndex >= 0 && args[dirIndex + 1]) {
    assetsDir = resolve(ROOT, args[dirIndex + 1]);
  }

  if (!existsSync(assetsDir)) {
    console.error(`Directory not found: ${assetsDir}`);
    console.log('Build the project first or specify a different directory with --dir');
    process.exit(1);
  }

  console.log('┌─────────────────────────────────────────────┐');
  console.log('│  IDEIA CDN Deploy                            │');
  console.log(`│  Provider: ${(provider || 'static').padEnd(28)}│`);
  console.log(`│  Directory: ${relative(ROOT, assetsDir).padEnd(27)}│`);
  console.log(`│  Mode: ${(dryRun ? 'DRY RUN' : 'LIVE').padEnd(30)}│`);
  console.log('└─────────────────────────────────────────────┘\n');

  const assets = collectAssets(assetsDir, assetsDir);

  if (assets.length === 0) {
    console.log('No assets found to deploy.\n');
    return;
  }

  const totalSize = assets.reduce((sum, a) => sum + a.size, 0);
  const byType: Record<string, { count: number; size: number }> = {};

  for (const asset of assets) {
    if (!byType[asset.type]) byType[asset.type] = { count: 0, size: 0 };
    byType[asset.type].count++;
    byType[asset.type].size += asset.size;
  }

  console.log(`Total: ${assets.length} assets, ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`);
  console.log('By type:');
  for (const [type, info] of Object.entries(byType)) {
    const shortType = type.split('/')[1] || type;
    const avg = (info.size / info.count / 1024).toFixed(1);
    console.log(`  ${shortType.padEnd(15)} ${info.count.toString().padStart(4)} files  ${(info.size / 1024).toFixed(0).padStart(8)} KB  avg ${avg} KB`);
  }

  console.log(`\nTop 10 largest assets:`);
  const top10 = assets.slice(0, 10);
  for (const asset of top10) {
    console.log(`  ${(asset.size / 1024).toFixed(1).padStart(8)} KB  ${asset.path}`);
  }

  if (dryRun) {
    console.log(`\n✅ Dry run complete. ${assets.length} assets ready for deployment.`);
    if (jsonOutput) {
      console.log(JSON.stringify({ assets, totalSize, count: assets.length }, null, 2));
    }
    return;
  }

  if (provider === 'static') {
    console.log(`\nStatic deployment: copy ${assetsDir} to your web server.`);
    console.log('For automated deployment, use a specific provider:');
    console.log('  --provider vercel    Deploy to Vercel');
    console.log('  --provider netlify   Deploy to Netlify');
    console.log('  --provider s3        Deploy to AWS S3');
    return;
  }

  if (provider === 'vercel') {
    console.log('\nVerifying Vercel CLI...');
    try {
      const { execSync } = require('node:child_process');
      execSync('npx vercel --version', { stdio: 'pipe' });
      console.log('Vercel CLI found. Deploying...');
      execSync(`npx vercel ${assetsDir} --prod`, { stdio: 'inherit' });
      console.log('✅ Deployed to Vercel');
    } catch {
      console.log('Vercel CLI not available. Install with: npm i -g vercel');
      console.log('Then run: vercel --prod');
    }
  }
}

deploy().catch(err => {
  console.error('Deploy failed:', err);
  process.exit(1);
});
