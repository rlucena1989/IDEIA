import { resolve } from 'path';
import { createLogger } from '@ideia/logger';
import { existsSync } from 'fs';
const logger = createLogger('env-loader');

export function loadEnv(root?: string): void {
  try {
    const dotenv = require('dotenv');
    const basePath = root || process.cwd();

    const envFiles = [
      resolve(basePath, '.env'),
      resolve(basePath, '.env.local'),
    ];

    for (const file of envFiles) {
      if (existsSync(file)) {
        dotenv.config({ path: file });
      }
    }
  } catch {
    // dotenv not available
  }
}
