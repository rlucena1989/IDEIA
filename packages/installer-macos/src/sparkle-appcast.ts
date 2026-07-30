import { readFileSync } from 'fs';
import { createLogger } from '@ideia/logger';
import { createSign } from 'crypto';
const logger = createLogger('sparkle-appcast');

export interface AppcastRelease {
  version: string;
  shortVersion: string;
  buildDate: Date;
  fileSize: number;
  minOSVersion: string;
  changelog: string;
  downloadUrl: string;
  signature: string;
}

export class SparkleAppcastGenerator {
  generate(releases: AppcastRelease[]): string {
    let items = '';
    for (const release of releases) {
      items += `
    <item>
      <title>Version ${release.shortVersion}</title>
      <description><![CDATA[${release.changelog}]]></description>
      <pubDate>${release.buildDate.toUTCString()}</pubDate>
      <enclosure
        url="${release.downloadUrl}"
        sparkle:version="${release.version}"
        sparkle:shortVersionString="${release.shortVersion}"
        sparkle:edSignature="${release.signature}"
        length="${release.fileSize}"
        type="application/octet-stream"
        sparkle:minimumSystemVersion="${release.minOSVersion}"
      />
    </item>`;
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     version="2.0">
  <channel>
    <title>IDEIA Changelog</title>
    <language>en</language>
    ${items}
  </channel>
</rss>`;
  }

  sign(privateKeyPath: string, content: string): string {
    const privateKey = readFileSync(privateKeyPath, 'utf-8');
    const signer = createSign('sha256');
    signer.update(content);
    return signer.sign(privateKey, 'base64');
  }
}
