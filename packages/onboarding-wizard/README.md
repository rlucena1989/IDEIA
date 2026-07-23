# @ideia/onboarding-wizard

> First-run wizard for IDEIA profile setup and autonomy level configuration.

Part of the [IDEIA](https://ideia.dev) ecosystem.

## Installation

```bash
npm install @ideia/onboarding-wizard
```

## Usage

```typescript
import { OnboardingWizard, WIZARD_STEPS, PROFILES, AUTONOMY_OPTIONS } from '@ideia/onboarding-wizard';

const wizard = new OnboardingWizard();
const result = await wizard.start();
console.log(result.summary);
```

## API

- `OnboardingWizard` — interactive wizard for initial IDEIA setup
- `WIZARD_STEPS` — predefined wizard step definitions
- `PROFILES` — available profile presets
- `AUTONOMY_OPTIONS` — autonomy level choices
- Types: `WizardMode`, `ProfileType`, `AutonomyLevel`, `ProfileOption`, `WizardStep`, `WizardField`, `WizardAnswer`, `WizardState`, `WizardSummary`

## License

MIT
