export interface UpdateCheckRequest {
  currentVersion: string;
  channel: string;
  platform: 'win32' | 'darwin' | 'linux';
  arch: 'x64' | 'arm64';
  clientId?: string;
}

export interface UpdateCheckResponse {
  version: string;
  releaseDate: string;
  notes: string;
  url: string;
  signature: string;
  mandatory: boolean;
  channel: 'stable' | 'beta' | 'alpha' | 'nightly';
  rolloutPercent?: number;
}

export class UpdateServerClient {
  constructor(private baseUrl: string) {}

  async checkForUpdates(request: UpdateCheckRequest): Promise<UpdateCheckResponse | null> {
    const target = `${request.platform}-${request.arch}`;
    const params = new URLSearchParams({ channel: request.channel });
    if (request.clientId) params.set('clientId', request.clientId);

    const response = await fetch(`${this.baseUrl}/update/${target}/${request.currentVersion}?${params}`);
    if (!response.ok) throw new Error(`Update server error: ${response.status}`);
    const data = await response.json() as UpdateCheckResponse & { upToDate?: boolean };
    if (data.upToDate) return null;
    return data;
  }

  async getLatestRelease(channel: string): Promise<UpdateCheckResponse | null> {
    const response = await fetch(`${this.baseUrl}/releases/latest/${channel}`);
    if (!response.ok) return null;
    return response.json();
  }
}
