import { createWriteStream, statSync } from 'fs';
import { createLogger } from '@ideia/logger';
import { request, RequestOptions } from 'https';
const logger = createLogger('resumable-download');

export interface DownloadOptions {
  url: string;
  dest: string;
  onProgress?: (percent: number, bytesPerSecond: number) => void;
  expectedSize?: number;
  expectedSha256?: string;
  signal?: AbortSignal;
}

export class ResumableDownload {
  private bytesDownloaded = 0;
  private bytesTotal = 0;
  private startTime = 0;

  async download(opts: DownloadOptions): Promise<void> {
    this.startTime = Date.now();
    const writeStream = createWriteStream(opts.dest, { flags: 'a' });
    const existingBytes = this.getExistingBytes(opts.dest);

    const reqOptions: RequestOptions = { headers: {} };
    if (existingBytes > 0) {
      reqOptions.headers = { Range: `bytes=${existingBytes}-` };
    }

    await new Promise<void>((resolve, reject) => {
      const req = request(opts.url, reqOptions, (res) => {
        this.bytesTotal = parseInt(res.headers['content-length'] || '0', 10) + existingBytes;
        res.on('data', (chunk: Buffer) => {
          if (opts.signal?.aborted) { req.destroy(); return; }
          writeStream.write(chunk);
          this.bytesDownloaded += chunk.length;
          if (opts.onProgress) {
            const elapsed = (Date.now() - this.startTime) / 1000;
            opts.onProgress((this.bytesDownloaded / this.bytesTotal) * 100, this.bytesDownloaded / elapsed);
          }
        });
        res.on('end', () => writeStream.end());
        res.on('error', reject);
      });
      req.on('error', reject);
      writeStream.on('finish', resolve);
      req.end();
    });

    if (opts.expectedSize && this.bytesDownloaded < opts.expectedSize) {
      throw new Error(`Download incomplete: ${this.bytesDownloaded}/${opts.expectedSize}`);
    }
  }

  private getExistingBytes(filePath: string): number {
    try { return statSync(filePath)?.size || 0; } catch { return 0; }
  }
}
