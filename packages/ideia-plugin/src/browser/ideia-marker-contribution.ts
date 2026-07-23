import { injectable, inject } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { MarkerManager } from '@theia/markers/lib/browser/marker-manager';
import { Marker } from '@theia/markers/lib/common/marker';

@injectable()
export class IDEIA_MarkerContribution {
  private trackedUris: Set<string> = new Set();

  constructor(
    @inject(MarkerManager) private markerManager: MarkerManager<Marker<unknown>>,
  ) {}

  reportDiagnostics(uri: URI, diagnostics: Marker<unknown>[]): void {
    this.markerManager.setMarkers(uri, 'ideia', diagnostics);
    this.trackedUris.add(uri.toString());
  }

  clearDiagnostics(uri: URI): void {
    this.markerManager.setMarkers(uri, 'ideia', []);
    this.trackedUris.delete(uri.toString());
  }

  clearAll(): void {
    for (const uriStr of this.trackedUris) {
      this.markerManager.setMarkers(new URI(uriStr), 'ideia', []);
    }
    this.trackedUris.clear();
  }
}
