# @ideia/profiles

> IDEIA Profile System — 5 presets (solo-dev, tech-lead, automator, enterprise, custom) with full config tree.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/profiles
```

## Usage

```typescript
import { Profiles, createProfiles, validate, validateProfile, isConfigValid } from '@ideia/profiles';

const profiles = createProfiles();
const config = profiles.get('solo-dev');
```

## API

- `Profiles` — profile management with preset configurations
- `createProfiles()` — factory function
- `validate()`, `validateProfile()`, `isConfigValid()` — config validation
- Types: `FullConfig`, `ProfileConfig`, `AutonomyConfig`, `ScannersConfig`, `ScannerEntry`, `BHPConfig`, `ContinuityConfig`, `SafetyConfig`, `UIConfig`, `NotificationsConfig`, `TelemetryConfig`, `AdvancedConfig`
- Types: `ProfileId`, `AutonomyLevel`, `RiskThreshold`, `NotificationChannel`, `LogLevel`, `ThemeMode`, `LayoutMode`, `SandboxLevel`, `TelemetryLevel`, `ContinuityStrategy`, `CheckpointStrategy`, `AdaptationStyle`, `UrgencyLevel`, `ValidationResult`, `ValidationError`, `ValidationWarning`

## License

MIT
