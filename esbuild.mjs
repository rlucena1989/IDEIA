import { browserOptions, watch } from './gen-esbuild.browser.mjs';
import { nodeOptions } from './gen-esbuild.node.mjs';

import esbuild from 'esbuild';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const META_DIR = resolve(__dirname, 'dist');
const META_FILE = resolve(META_DIR, 'meta.json');

const production = process.argv.includes('--mode') && process.argv[process.argv.indexOf('--mode') + 1] === 'production';

const sharedOptions = {
  metafile: true,
};

const enhancedBrowserOptions = {
  ...browserOptions,
  ...sharedOptions,
  splitting: production,
  chunkNames: production ? 'chunks/[name]-[hash]' : undefined,
};

const browserContext = await esbuild.context(enhancedBrowserOptions);
const nodeContext = await esbuild.context({ ...nodeOptions, ...sharedOptions });

if (watch) {
  await Promise.all([
    browserContext.watch(),
    nodeContext.watch(),
  ]);
} else {
  try {
    const browserResult = await browserContext.rebuild();
    const nodeResult = await nodeContext.rebuild();

    if (!existsSync(META_DIR)) {
      mkdirSync(META_DIR, { recursive: true });
    }

    const combinedMeta = {
      inputs: { ...browserResult.metafile.inputs, ...nodeResult.metafile.inputs },
      outputs: { ...browserResult.metafile.outputs, ...nodeResult.metafile.outputs },
    };
    writeFileSync(META_FILE, JSON.stringify(combinedMeta, null, 2));

    await browserContext.dispose();
    await nodeContext.dispose();
  } catch {
    process.exit(1);
  }
}
