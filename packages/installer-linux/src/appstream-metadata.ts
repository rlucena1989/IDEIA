export interface AppStreamConfig {
  appId: string;
  name: string;
  summary: string;
  description: string;
  license: string;
  homepage: string;
  bugtracker: string;
  categories: string[];
  screenshots: Array<{ caption: string; image: string }>;
  releases: Array<{ version: string; date: string }>;
}

export class AppStreamMetadataGenerator {
  generate(config: AppStreamConfig): string {
    const screenshots = config.screenshots.map((s, i) =>
      `    <screenshot${i === 0 ? ' type="default"' : ''}>\n      <caption>${s.caption}</caption>\n      <image>${s.image}</image>\n    </screenshot>`
    ).join('\n');

    const releases = config.releases.map(r =>
      `    <release version="${r.version}" date="${r.date}" />`
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<component type="desktop-application">
  <id>${config.appId}</id>
  <metadata_license>${config.license}</metadata_license>
  <project_license>LicenseRef-proprietary</project_license>
  <name>${config.name}</name>
  <summary>${config.summary}</summary>
  <description>
    <p>${config.description}</p>
  </description>
  <categories>
    ${config.categories.map(c => `<category>${c}</category>`).join('\n    ')}
  </categories>
  <url type="homepage">${config.homepage}</url>
  <url type="bugtracker">${config.bugtracker}</url>
  <screenshots>
${screenshots}
  </screenshots>
  <releases>
${releases}
  </releases>
  <content_rating type="oars-1.1" />
  <developer_name>${config.name}</developer_name>
  <launchable type="desktop-id">${config.appId}.desktop</launchable>
  <provides>
    <binary>${config.name.toLowerCase()}</binary>
  </provides>
</component>`;
  }
}
