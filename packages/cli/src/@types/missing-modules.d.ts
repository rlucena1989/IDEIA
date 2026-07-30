// Stub declarations for missing packages
declare module '@ideia/adapter-base' {
  export const adapterRegistry: any;
}

declare module '@ideia/privacy-center' {
  export const privacyCenter: any;
  export const PrivacyCenter: any;
}

declare module '@ideia/usability-profile' {
  export const usabilityProfile: any;
  export const UsabilityProfile: any;
}

declare module '@ideia/spec-engine' {
  export class SpecGenerator {
    constructor(config?: any);
    generate(spec: any): any;
  }
  export class SteeringFileManager {
    constructor(options?: any);
    load(path: string): any;
    save(path: string, data: any): void;
  }
  export class HookEngine {
    constructor(options?: any);
    execute(hook: string, data: any): any;
  }
}
