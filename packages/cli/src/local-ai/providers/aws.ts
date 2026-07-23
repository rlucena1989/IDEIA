import { AiProvider, ProviderConfig, ProviderResponse } from './index';
import crypto from 'node:crypto';

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(Buffer.from(`AWS4${key}`, 'utf-8'), dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

/** Classe responsável por processa provider. */
export class AwsProvider implements AiProvider {
  readonly name = 'aws';

  async streamQuery(prompt: string, model: string, onDelta: (chunk: string) => void, config?: ProviderConfig): Promise<ProviderResponse> {
    const result = await this.query(prompt, model, config);
    onDelta(result.content);
    return result;
  }

  async query(prompt: string, model: string, config?: ProviderConfig): Promise<ProviderResponse> {
    const accessKey = process.env.AWS_ACCESS_KEY_ID || '';
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    const sessionToken = process.env.AWS_SESSION_TOKEN;
    const region = config?.region || process.env.AWS_REGION || 'us-east-1';
    const host = `bedrock-runtime.${region}.amazonaws.com`;
    const url = `https://${host}/model/${model}/invoke`;
    const start = Date.now();

    if (!accessKey || !secretKey) {
      throw new Error('AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
    }

    const body = JSON.stringify({ prompt, max_tokens_to_sample: 2048, temperature: 0.7 });
    const bodyHash = sha256(body);
    const amzDate = new Date().toISOString().replace(/[:-]/g, '').replace(/\.\d{3}/, '');
    const dateStamp = amzDate.slice(0, 8);
    const service = 'bedrock';
    const algorithm = 'AWS4-HMAC-SHA256';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Amz-Date': amzDate,
      'Host': host,
      'X-Amz-Content-Sha256': bodyHash,
    };
    if (sessionToken) headers['X-Amz-Security-Token'] = sessionToken;

    const signedHeaders = Object.keys(headers).map(h => h.toLowerCase()).sort().join(';');
    const canonicalRequest = [
      'POST',
      `/model/${model}/invoke`,
      '',
      ...Object.entries(headers)
        .map(([k, v]) => `${k.toLowerCase()}:${v}`)
        .sort(),
      '',
      signedHeaders,
      bodyHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      sha256(canonicalRequest),
    ].join('\n');

    const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
    const signature = hmac(signingKey, stringToSign).toString('hex');

    headers['Authorization'] = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(config?.timeoutMs || 30000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AWS Bedrock HTTP ${res.status}: ${res.statusText} — ${text.slice(0, 200)}`);
    }

    const data = await res.json() as { completion?: string; output?: { text?: string } };

    return {
      content: data.completion?.trim() || data.output?.text?.trim() || '',
      model,
      provider: this.name,
      latencyMs: Date.now() - start,
    };
  }

  async listModels(): Promise<string[]> {
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKey = process.env.AWS_ACCESS_KEY_ID || '';
    if (!accessKey) return ['anthropic.claude-v2', 'amazon.titan-text-lite', 'meta.llama2-13b'];

    try {
      const res = await fetch(`https://bedrock.${region}.amazonaws.com/foundation-models`, {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json() as { modelSummaries?: Array<{ modelId: string }> };
        return data.modelSummaries?.map(m => m.modelId) || [];
      }
    } catch { }
    return ['anthropic.claude-v2', 'amazon.titan-text-lite', 'meta.llama2-13b'];
  }

  async healthCheck(): Promise<boolean> {
    return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  }
}
